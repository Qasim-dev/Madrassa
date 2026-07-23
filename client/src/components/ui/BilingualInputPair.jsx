import FormField from './FormField.jsx'
import AppInput from './AppInput.jsx'

/**
 * Urdu + English name fields side by side (common enrollment pattern).
 */
export default function BilingualInputPair({
  ur,
  en,
  labelKeys = { ur: 'nameUrField', en: 'nameEnField' },
  col = 4,
  required = false,
  className = '',
}) {
  return (
    <>
      <FormField
        k={labelKeys.ur}
        htmlFor={ur.id}
        required={required}
        col={col}
        langField="ur"
        className={className}
      >
        <AppInput
          id={ur.id}
          value={ur.value}
          onChange={ur.onChange}
          placeholder={ur.placeholder}
          disabled={ur.disabled}
          data-lang-field="ur"
        />
      </FormField>
      <FormField
        k={labelKeys.en}
        htmlFor={en.id}
        required={required}
        col={col}
        langField="en"
        className={className}
      >
        <AppInput
          id={en.id}
          value={en.value}
          onChange={en.onChange}
          placeholder={en.placeholder}
          disabled={en.disabled}
          latin
          data-lang-field="en"
        />
      </FormField>
    </>
  )
}
