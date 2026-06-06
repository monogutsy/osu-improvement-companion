import { useEffect, useState } from 'react';

function getStoredValue(key, initialValue) {
  if (typeof window === 'undefined') {
    return initialValue;
  }

  try {
    const item = window.localStorage.getItem(key);
    if (item === null) {
      return initialValue;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error(`Failed to read localStorage key "${key}"`, error);
    return initialValue;
  }
}

export default function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => getStoredValue(key, initialValue));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Failed to write localStorage key "${key}"`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
