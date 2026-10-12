import { useEffect } from "react";
import "@/App.css";
import "@/i18n";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import ReportPage from "@/pages/ReportPage";
import ComparePage from "@/pages/ComparePage";
import BulkPage from "@/pages/BulkPage";
import HistoryPage from "@/pages/HistoryPage";
import SettingsPage from "@/pages/SettingsPage";
import LoginPage from "@/pages/LoginPage";
import PrivacyPage from "@/pages/PrivacyPage";
import { Toaster } from "sonner";
import ServerWakeBanner from "@/components/ServerWakeBanner";
import { sessionId, warmUp } from "@/lib/api";

function App() {
  useEffect(() => {
    sessionId();
    warmUp();
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/bulk" element={<BulkPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/report/:id" element={<ReportPage />} />
        </Routes>
      </BrowserRouter>
      <ServerWakeBanner />
      <Toaster position="bottom-right" theme="dark" />
    </div>
  );
}

export default App;
