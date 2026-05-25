import { BrowserRouter, Routes, Route } from "react-router-dom";
import Start from "./pages/Start";
import Dashboard from "./pages/Dashboard";
import { ToastProvider } from "./components/ToastProvider";

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Start />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
