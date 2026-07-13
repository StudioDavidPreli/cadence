--!strict
-- ============================================================
-- Pixelate  (Rive PathEffect script, Luau)
--
-- Re-renders a shape as an After-Effects-style mosaic WITHOUT
-- touching its animation. Attach it to any shape whose paths are
-- driven by converters / a driver node; every frame it receives
-- the shape's live (morphed) geometry plus its world transform,
-- rasterises the post-transform silhouette onto ONE shared world
-- grid, and emits an axis-aligned cell per covered square.
--
-- Because coverage is computed in WORLD space and every attached
-- shape uses the same `cellSize`, all shapes share one pixel
-- lattice and stay locked to the artboard axes through rotation
-- and scale. Each shape keeps its own paint, so colours are
-- preserved with no extra wiring.
--
-- Coverage uses the nonzero winding rule (matches Rive's fill and
-- reproduces holes made by opposite-wound contours). Emitted
-- cells are wound clockwise because the renderer only fills CW
-- contours and exposes no fill-rule control.
--
-- Controls:
--   cellSize    pixel size in world units (bigger = chunkier)
--   gap         seam between cells (0 = solid pixels)
--   bakeInverse 1 = emit cells through M^-1 so Rive's re-apply of
--               the world transform lands them on the grid (the
--               correct default). If pixels appear to double-spin
--               with the shape, set this to 0.
-- ============================================================

local SUBDIV = 14 -- curve-flattening steps per quad/cubic segment

type Pixelate = {
    cellSize: Input<number>,
    gap: Input<number>,
    bakeInverse: Input<number>,
    context: Context,
}

-- push a local point, transformed by M, as a world x,y pair
local function pushW(pts: { number }, m: Mat2D, lx: number, ly: number)
    local w = m * Vector.xy(lx, ly)
    pts[#pts + 1] = w.x
    pts[#pts + 1] = w.y
end

-- emit one grid cell (column c, row r) as a clockwise quad
local function emitCell(out: Path, minv: Mat2D, c: number, r: number, cs: number, g: number, inv: boolean, flip: boolean)
    local x0 = c * cs + g
    local y0 = r * cs + g
    local x1 = (c + 1) * cs - g
    local y1 = (r + 1) * cs - g
    local p0: Vector
    local p1: Vector
    local p2: Vector
    local p3: Vector
    if inv then
        p0 = minv * Vector.xy(x0, y0)
        p1 = minv * Vector.xy(x1, y0)
        p2 = minv * Vector.xy(x1, y1)
        p3 = minv * Vector.xy(x0, y1)
    else
        p0 = Vector.xy(x0, y0)
        p1 = Vector.xy(x1, y0)
        p2 = Vector.xy(x1, y1)
        p3 = Vector.xy(x0, y1)
    end
    out:moveTo(p0)
    if flip then
        out:lineTo(p3)
        out:lineTo(p2)
        out:lineTo(p1)
    else
        out:lineTo(p1)
        out:lineTo(p2)
        out:lineTo(p3)
    end
    out:close()
end

function init(self: Pixelate, context: Context): boolean
    self.context = context
    return true
end

function advance(self: Pixelate, seconds: number): boolean
    return true
end

function update(self: Pixelate, inPath: PathData, node: NodeReadData): PathData
    local out = Path.new()

    local cs = self.cellSize
    if cs < 1 then
        cs = 1
    end
    local g = self.gap
    if g < 0 then
        g = 0
    end
    if g > cs * 0.45 then
        g = cs * 0.45
    end
    local inv = self.bakeInverse ~= 0

    local m = node.worldTransform
    local minv = m:invert()
    if minv == nil then
        return out
    end

    -- keep emitted cells clockwise even if the transform mirrors
    local det = m.xx * m.yy - m.xy * m.yx
    local flip = inv and det < 0

    -- 1) flatten the live path into world-space contours (flat x,y arrays)
    local contours: { { number } } = {}
    local cur: { number } = {}
    local curX = 0
    local curY = 0
    local commandCount = #inPath
    for ci = 1, commandCount do
        local cmd = inPath[ci]
        local kind = cmd.type
        if kind == "moveTo" then
            if #cur > 0 then
                contours[#contours + 1] = cur
            end
            cur = {}
            local p = cmd[1]
            curX = p.x
            curY = p.y
            pushW(cur, m, curX, curY)
        elseif kind == "lineTo" then
            local p = cmd[1]
            curX = p.x
            curY = p.y
            pushW(cur, m, curX, curY)
        elseif kind == "quadTo" then
            local ctrl = cmd[1]
            local endp = cmd[2]
            local ax = curX
            local ay = curY
            for i = 1, SUBDIV do
                local u = i / SUBDIV
                local v = 1 - u
                local x = v * v * ax + 2 * v * u * ctrl.x + u * u * endp.x
                local y = v * v * ay + 2 * v * u * ctrl.y + u * u * endp.y
                pushW(cur, m, x, y)
            end
            curX = endp.x
            curY = endp.y
        elseif kind == "cubicTo" then
            local c1 = cmd[1]
            local c2 = cmd[2]
            local endp = cmd[3]
            local ax = curX
            local ay = curY
            for i = 1, SUBDIV do
                local u = i / SUBDIV
                local v = 1 - u
                local x = v * v * v * ax + 3 * v * v * u * c1.x + 3 * v * u * u * c2.x + u * u * u * endp.x
                local y = v * v * v * ay + 3 * v * v * u * c1.y + 3 * v * u * u * c2.y + u * u * u * endp.y
                pushW(cur, m, x, y)
            end
            curX = endp.x
            curY = endp.y
        end
    end
    if #cur > 0 then
        contours[#contours + 1] = cur
    end
    if #contours == 0 then
        return out
    end

    -- 2) world bounds -> row range
    local minY = math.huge
    local maxY = -math.huge
    for _, ct in ipairs(contours) do
        local len = #ct
        local k = 2
        while k <= len do
            local y = ct[k]
            if y < minY then
                minY = y
            end
            if y > maxY then
                maxY = y
            end
            k = k + 2
        end
    end
    local r0 = math.floor(minY / cs)
    local r1 = math.floor(maxY / cs)

    -- 3) nonzero-winding scanline; emit covered cells
    for r = r0, r1 do
        local yc = (r + 0.5) * cs
        local xsx: { number } = {}
        local xsd: { number } = {}
        for _, ct in ipairs(contours) do
            local len = #ct
            local pointCount = len // 2
            for i = 0, pointCount - 1 do
                local ai = i * 2 + 1
                local bi = ((i + 1) % pointCount) * 2 + 1
                local x0 = ct[ai]
                local y0 = ct[ai + 1]
                local x1 = ct[bi]
                local y1 = ct[bi + 1]
                if y0 <= yc and yc < y1 then
                    xsx[#xsx + 1] = x0 + (yc - y0) * (x1 - x0) / (y1 - y0)
                    xsd[#xsd + 1] = 1
                elseif y1 <= yc and yc < y0 then
                    xsx[#xsx + 1] = x0 + (yc - y0) * (x1 - x0) / (y1 - y0)
                    xsd[#xsd + 1] = -1
                end
            end
        end
        local cnt = #xsx
        for a = 2, cnt do
            local vx = xsx[a]
            local vd = xsd[a]
            local b = a - 1
            while b >= 1 and xsx[b] > vx do
                xsx[b + 1] = xsx[b]
                xsd[b + 1] = xsd[b]
                b = b - 1
            end
            xsx[b + 1] = vx
            xsd[b + 1] = vd
        end
        local wind = 0
        for i = 1, cnt - 1 do
            wind = wind + xsd[i]
            if wind ~= 0 then
                local xa = xsx[i]
                local xb = xsx[i + 1]
                local c0 = math.floor(xa / cs)
                local c1 = math.floor(xb / cs)
                for c = c0, c1 do
                    local xcen = (c + 0.5) * cs
                    if xcen >= xa and xcen <= xb then
                        emitCell(out, minv, c, r, cs, g, inv, flip)
                    end
                end
            end
        end
    end

    return out
end

return function(): PathEffect<Pixelate>
    return {
        init = init,
        advance = advance,
        update = update,
        cellSize = 4,
        gap = 0,
        bakeInverse = 1,
        context = late(),
    }
end