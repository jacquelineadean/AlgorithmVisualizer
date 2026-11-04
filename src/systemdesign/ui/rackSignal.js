import { createContext, useContext } from 'react';

// Lets a lab point the rack at a layer. The request trace uses it to move
// the rack's token tray by tray while its request travels the stack.
export const RackSignal = createContext({ peek: null, setPeek: () => {} });

export const useRackSignal = () => useContext(RackSignal);
