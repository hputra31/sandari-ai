
import React, { useState, useEffect, useCallback, useRef } from 'react';
import localforage from 'localforage';

localforage.config({
  name: 'SandariAI',
  storeName: 'history_store'
});

function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);
  const stateRef = useRef(storedValue);

  // Load from localforage (IndexedDB) on mount
  useEffect(() => {
    localforage.getItem<T>(key).then((val) => {
       if (val !== null) {
          setStoredValue(val);
          stateRef.current = val;
       }
       setIsLoaded(true);
    }).catch(error => {
       console.error("Failed to load from IndexedDB", error);
       setIsLoaded(true);
    });
  }, [key]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    if (!isLoaded) return; // Prevent overwriting data before initial loaded
    try {
      const valueToStore = value instanceof Function ? value(stateRef.current) : value;
      setStoredValue(valueToStore);
      stateRef.current = valueToStore;
      localforage.setItem(key, valueToStore).catch(err => {
         console.error("Async setItem failed", err);
      });
    } catch (error) {
      console.error("Error setting IndexedDB value", error);
    }
  }, [key, isLoaded]);

  return [storedValue, setValue, isLoaded];
}

export default useLocalStorage;