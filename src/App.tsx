import { useEffect, useState } from 'react';
import { Chart } from './components/Chart/Chart';
import { ChartData, Theme } from './types';
import data from './data.json';

const chartData: ChartData = data as ChartData;

function App() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="App">
      <Chart data={chartData} onThemeChange={setTheme} />
    </div>
  );
}

export default App;

