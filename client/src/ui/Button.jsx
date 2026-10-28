import { buttonClass } from './styles.js'

// Bouton du design system. variant : primary | secondary | danger ; size : sm | md ; shape : rounded | pill
export default function Button({ variant, size, shape, className, type = 'button', ...props }) {
  return <button type={type} className={buttonClass({ variant, size, shape, className })} {...props} />
}
