import { Routes, Route } from "react-router-dom";
import ChatPage from "./routes/index";
import { Toaster } from "sonner";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        {/* Add more routes here if needed */}
      </Routes>
      <Toaster position="top-center" />
    </>
  );
}

export default App;
