import React, { useRef, useEffect } from 'react';

export default function IndeterminateCheckbox({ indeterminate, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <input type="checkbox" ref={ref} {...rest} />;
}
