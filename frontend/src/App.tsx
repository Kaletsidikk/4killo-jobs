import { useTelegram } from "./hooks/useTelegram";
import Onboarding from "./components/onboarding/Onboarding";

function App() {
  useTelegram();
  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
       <Onboarding />
    </div>
  )
}

export default App