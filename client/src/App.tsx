import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import DeviceA from './pages/DeviceA';
import DeviceB from './pages/DeviceB';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/device-a" element={<DeviceA />} />
        <Route path="/device-b" element={<DeviceB />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
