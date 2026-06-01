import { createContext, useContext, useState } from 'react';

/**
 * NadiaContext — lets the EmailTemplates form register its variables and
 * onUseTemplate callback so the global NadiaAI panel can use them.
 *
 * Any page that wants Nadia's email generator to be active must call
 * setEmailContext({ variables, onUseTemplate }) on mount and
 * setEmailContext(null) on unmount.
 */

const NadiaContext = createContext(null);

export const NadiaProvider = ({ children }) => {
  const [emailContext, setEmailContext] = useState(null);
  return (
    <NadiaContext.Provider value={{ emailContext, setEmailContext }}>
      {children}
    </NadiaContext.Provider>
  );
};

export const useNadia = () => useContext(NadiaContext);
