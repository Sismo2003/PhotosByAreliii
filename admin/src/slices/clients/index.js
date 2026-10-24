// Public surface of the Clients slice.
export { useClientsStore } from "./store";
export {
  loadClientsSummaryThunk,
  loadClientsListThunk,
  loadClientThunk,
  createClientThunk,
  updateClientThunk,
  setClientReminderThunk,
  deleteClientThunk,
  restoreClientThunk,
} from "./thunks";
