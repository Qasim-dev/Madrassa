/**
 * E-Jamia Pro — reusable UI primitives
 *
 * @example
 * import { FormField, AppInput, AppButton, ModalForm } from '../components/ui'
 *
 * <FormField k="phone" htmlFor="f-phone" col={4}>
 *   <AppInput id="f-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
 * </FormField>
 */

export { default as AppButton } from './AppButton.jsx'
export { default as AppInput } from './AppInput.jsx'
export { default as AppFileInput } from './AppFileInput.jsx'
export { default as AppSelect } from './AppSelect.jsx'
export { default as AppCreatableSelect } from './AppCreatableSelect.jsx'
export { default as AppTextarea } from './AppTextarea.jsx'
export { default as AppCheckbox } from './AppCheckbox.jsx'
export { default as AppRadioGroup } from './AppRadioGroup.jsx'
export { default as AppRadio } from './AppRadio.jsx'
export { default as FormField } from './FormField.jsx'
export { default as FormRow } from './FormRow.jsx'
export { default as FormSection } from './FormSection.jsx'
export { default as BilingualInputPair } from './BilingualInputPair.jsx'
export { default as ModalForm, ModalFormFooter } from './ModalForm.jsx'
export { default as FieldStatusIcon } from './FieldStatusIcon.jsx'
export { controlClasses } from './controlClasses.js'
export { default as AppKpiCards, AppKpiCard } from './AppKpiCards.jsx'
export { cn } from './cn.js'
