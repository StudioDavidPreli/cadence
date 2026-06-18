import { Dropdown } from '../../components/Dropdown'
import styles from './SecondaryAction.module.css'

// P08 Secondary Action. The Dropdown owns the principle: the primary action is
// the menu opening; the secondary action is the supporting motion that
// accompanies it (the chevron rotating, items settling in). The secondary
// motion reinforces the primary without competing with it.
export function SecondaryAction() {
  return (
    <div className={styles.dropdownDemo}>
      <Dropdown label="Options" />
    </div>
  )
}
