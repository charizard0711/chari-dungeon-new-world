let sequence=0;
/** Keep native validity rules, present errors inside the game's UI. */
export function installFormValidation(form:HTMLFormElement){
  form.noValidate=true;
  const fields=Array.from(form.querySelectorAll<HTMLInputElement>('input'));
  const messages=new Map<HTMLInputElement,HTMLElement>();
  for(const field of fields){
    const message=document.createElement('span');message.className='lobby-field-error';message.id=`field-error-${++sequence}`;message.hidden=true;message.setAttribute('aria-live','polite');
    field.insertAdjacentElement('afterend',message);messages.set(field,message);field.setAttribute('aria-describedby',message.id);
    field.addEventListener('input',()=>{field.setCustomValidity('');field.removeAttribute('aria-invalid');message.hidden=true;message.textContent='';});
  }
  return ()=>{
    let first:HTMLInputElement|undefined;
    for(const field of fields){
      const v=field.validity;const message=messages.get(field)!;
      const text=v.valueMissing?'入力してください。':v.typeMismatch?'メールアドレスの形式を確認してください。':v.tooShort?`${field.minLength}文字以上で入力してください。`:!v.valid?(field.validationMessage||'入力内容を確認してください。'):'';
      message.textContent=text;message.hidden=!text;
      if(text){field.setAttribute('aria-invalid','true');first??=field;}else field.removeAttribute('aria-invalid');
    }
    first?.focus();return !first;
  };
}
