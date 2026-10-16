import { createContext, useContext, useState } from "react";

const DatasetContext = createContext(null);

export function DatasetProvider({ children }) {
  const [dataset, setDataset] = useState(null);

  return (
    <DatasetContext.Provider value={{ dataset, setDataset }}>
      {children}
    </DatasetContext.Provider>
  );
}

export function useDataset() {
  const context = useContext(DatasetContext);

  if (!context) {
    throw new Error(
      "useDataset must be used inside a DatasetProvider"
    );
  }

  return context;
}