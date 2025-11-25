import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  LineChart,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

type CanvasOptionsWithScale = {
  background?: string;
  scale?: number;
  useCORS?: boolean;
  allowTaint?: boolean;
  logging?: boolean;
  width?: number;
  height?: number;
  windowWidth?: number;
  windowHeight?: number;
};
import { ChartData, TimeRange, LineStyle, Theme } from '../../types';
import { processData, getVariationKey, getVariationName } from '../../utils/dataProcessor';
import styles from './Chart.module.css';

interface ChartProps {
  data: ChartData;
  onThemeChange?: (theme: Theme) => void;
}

const COLORS = ['#4a90e2', '#50c878', '#ff6b6b', '#ffa500'];

const CustomTooltip = ({ active, payload, label, theme }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const maxValue = Math.max(...payload.map((entry: any) => entry.value));

  return (
    <div className={`${styles.tooltip} ${theme === 'dark' ? styles.tooltipDark : ''}`}>
      <div className={styles.tooltipDate}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        {label}
      </div>
      {payload.map((entry: any, index: number) => (
        <div key={index} className={styles.tooltipItem}>
          <span className={styles.tooltipLabel} style={{ color: entry.color }}>
            <span className={styles.tooltipDot} style={{ backgroundColor: entry.color }}></span>
            {entry.name}
            {entry.value === maxValue && entry.value > 0 && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#ffa500' }}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            )}
          </span>
          <span className={styles.tooltipValue}>{entry.value.toFixed(2)}%</span>
        </div>
      ))}
    </div>
  );
};

export const Chart: React.FC<ChartProps> = ({ data, onThemeChange }) => {
  const [selectedVariations, setSelectedVariations] = useState<string[]>(() => {
    return data.variations.map(v => getVariationKey(v));
  });
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lineStyle, setLineStyle] = useState<LineStyle>('line');
  const [theme, setTheme] = useState<Theme>('light');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<number>(0);
  const chartRef = useRef<HTMLDivElement>(null);
  const zoomTrackRef = useRef<HTMLDivElement>(null);

  const processedData = useMemo(
    () => processData(data, selectedVariations, timeRange),
    [data, selectedVariations, timeRange]
  );

  // Вычисляем видимый диапазон данных на основе зума и панорамирования
  const visibleDataRange = useMemo(() => {
    if (zoomLevel <= 1) {
      return null;
    }

    const totalPoints = processedData.length;
    const visiblePoints = Math.floor(totalPoints / zoomLevel);
    const maxOffset = Math.max(0, totalPoints - visiblePoints);

    const clampedOffset = Math.max(0, Math.min(panOffset, maxOffset));
    const startIndex = Math.floor(clampedOffset);
    const endIndex = Math.min(startIndex + visiblePoints - 1, totalPoints - 1);

    return [startIndex, endIndex] as [number, number];
  }, [zoomLevel, panOffset, processedData.length]);

  const yAxisDomain = useMemo(() => {
    const allValues: number[] = [];
    const dataToUse = visibleDataRange 
      ? processedData.slice(visibleDataRange[0], visibleDataRange[1] + 1)
      : processedData;
    
    dataToUse.forEach((point) => {
      selectedVariations.forEach((key) => {
        const value = point[key] as number;
        if (!isNaN(value) && isFinite(value) && value !== null && value !== undefined) {
          allValues.push(value);
        }
      });
    });

    if (allValues.length === 0) return [0, 100];

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    
    // Проверяем, что min и max - валидные числа
    if (isNaN(min) || isNaN(max) || !isFinite(min) || !isFinite(max)) {
      return [0, 100];
    }
    
    const range = max - min;
    let paddingTop: number;
    let paddingBottom: number;
    
    const isSmoothMode = lineStyle === 'smooth';
    
    if (range > 0) {
      if (isSmoothMode) {
        paddingTop = range * 0.2;
        paddingBottom = range * 0.1;
      } else {
        paddingTop = range * 0.1;
        paddingBottom = range * 0.1;
      }
    } else if (max > 0) {
      if (isSmoothMode) {
        paddingTop = max * 0.2;
        paddingBottom = max * 0.1;
      } else {
        paddingTop = max * 0.1;
        paddingBottom = max * 0.1;
      }
    } else {
      paddingTop = 1;
      paddingBottom = 1;
    }
    
    if (paddingTop < 1) paddingTop = 1;
    if (paddingBottom < 1) paddingBottom = 1;
    
    // Для smooth режима добавляем дополнительное пространство вниз (-5%)
    const minDomain = isSmoothMode 
      ? Math.max(-5, min - paddingBottom - 5)
      : Math.max(0, min - paddingBottom);
    const maxDomain = max + paddingTop;

    const finalMax = isNaN(maxDomain) || !isFinite(maxDomain) 
      ? Math.max(max * 1.2, 100) 
      : maxDomain;
    const finalMin = isNaN(minDomain) || !isFinite(minDomain) 
      ? (isSmoothMode ? -5 : 0)
      : minDomain;

    return [finalMin, finalMax];
  }, [processedData, selectedVariations, visibleDataRange, lineStyle]);

  const getLineType = (): 'monotone' | 'natural' => {
    if (lineStyle === 'smooth') return 'natural';
    if (lineStyle === 'area') return 'monotone';
    return 'monotone';
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 5));
    setPanOffset(0);
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const newLevel = Math.max(prev - 0.5, 1);
      if (newLevel === 1) {
        setPanOffset(0); // Сбрасываем панорамирование при сбросе зума
      }
      return newLevel;
    });
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setPanOffset(0);
  };

  // Обработчики для панорамирования и перетаскивания ползунка
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [panStart, setPanStart] = useState(0);

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingSlider(true);
    setIsPanning(true);
    setPanStart(e.clientX);
  };

  const handleChartMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1 && !(e.target as HTMLElement).closest('.zoomControls')) {
      setIsPanning(true);
      setIsDraggingSlider(false);
      setPanStart(e.clientX);
    }
  };



  // Глобальные обработчики для перетаскивания
  useEffect(() => {
    if (isPanning) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const delta = panStart - e.clientX;
        
        if (isDraggingSlider && zoomTrackRef.current) {
          // Перетаскивание ползунка зума
          const track = zoomTrackRef.current;
          const rect = track.getBoundingClientRect();
          const currentX = e.clientX - rect.left;
          const percentage = Math.max(0, Math.min(currentX / rect.width, 1));
          const newZoomLevel = 1 + percentage * 4;
          setZoomLevel(newZoomLevel);
          setPanOffset(0);
        } else if (zoomLevel > 1) {
          // Панорамирование графика
          const totalPoints = processedData.length;
          const visiblePoints = Math.floor(totalPoints / zoomLevel);
          const maxOffset = Math.max(0, totalPoints - visiblePoints);
          
          // Преобразуем пиксели в смещение данных
          const chartWidth = chartRef.current?.querySelector('.recharts-wrapper')?.clientWidth || 800;
          const pixelToDataRatio = maxOffset / chartWidth;
          const newOffset = panOffset + delta * pixelToDataRatio;
          
          setPanOffset(Math.max(0, Math.min(newOffset, maxOffset)));
        }
        setPanStart(e.clientX);
      };

      const handleGlobalMouseUp = () => {
        setIsPanning(false);
        setIsDraggingSlider(false);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isPanning, isDraggingSlider, panStart, zoomLevel, panOffset, processedData.length]);

  const exportToPNG = async () => {
    if (!chartRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      
      // Временно заменяем select на div с текстом для лучшего захвата
      const selects = chartRef.current.querySelectorAll('select');
      const selectReplacements: Array<{ select: HTMLSelectElement; replacement: HTMLDivElement }> = [];
      
      selects.forEach((select) => {
        const selectedOption = select.options[select.selectedIndex];
        const text = selectedOption ? selectedOption.text : '';
        const div = document.createElement('div');
        div.textContent = text;
        const computedStyle = window.getComputedStyle(select);
        div.style.cssText = computedStyle.cssText;
        div.style.position = 'absolute';
        div.style.left = select.offsetLeft + 'px';
        div.style.top = select.offsetTop + 'px';
        div.style.width = select.offsetWidth + 'px';
        div.style.height = select.offsetHeight + 'px';
        div.style.padding = computedStyle.padding;
        div.style.border = computedStyle.border;
        div.style.borderRadius = computedStyle.borderRadius;
        div.style.backgroundColor = computedStyle.backgroundColor;
        div.style.color = computedStyle.color;
        div.style.fontSize = computedStyle.fontSize;
        div.style.fontFamily = computedStyle.fontFamily;
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.paddingLeft = computedStyle.paddingLeft;
        div.style.paddingRight = computedStyle.paddingRight;
        div.style.backgroundImage = computedStyle.backgroundImage;
        div.style.backgroundPosition = computedStyle.backgroundPosition;
        div.style.backgroundRepeat = computedStyle.backgroundRepeat;
        div.className = select.className;
        
        select.style.visibility = 'hidden';
        select.parentNode?.insertBefore(div, select);
        selectReplacements.push({ select, replacement: div });
      });
      
      // Небольшая задержка для применения изменений
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Улучшенные настройки для захвата всех элементов
      const canvas = await html2canvas(
        chartRef.current,
        {
          background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
          scale: 3,
          useCORS: true,
          allowTaint: false,
          logging: false,
          width: chartRef.current.scrollWidth,
          height: chartRef.current.scrollHeight,
          windowWidth: chartRef.current.scrollWidth,
          windowHeight: chartRef.current.scrollHeight,
        } as CanvasOptionsWithScale
      );
      
      selectReplacements.forEach(({ select, replacement }) => {
        select.style.visibility = 'visible';
        replacement.remove();
      });
      
      const link = document.createElement('a');
      link.download = `ab-test-chart-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error exporting chart:', error);
      alert('Ошибка при экспорте графика. Убедитесь, что html2canvas установлен.');
    }
  };

  const displayData = useMemo(() => {
    let data = processedData;
    
    if (visibleDataRange && visibleDataRange[0] >= 0 && visibleDataRange[1] < processedData.length) {
      data = processedData.slice(visibleDataRange[0], visibleDataRange[1] + 1);
    }
    
    return data
      .filter((point) => point && point.date)
      .map((point) => {
        const cleanPoint: any = { date: point.date };
        selectedVariations.forEach((key) => {
          const value = point[key] as number;
          cleanPoint[key] = (isNaN(value) || !isFinite(value) || value === null || value === undefined) 
            ? 0 
            : Number(value);
        });
        return cleanPoint;
      });
  }, [processedData, visibleDataRange, selectedVariations]);

  const containerClass = `${styles.chartContainer} ${theme === 'dark' ? styles.dark : ''}`;

  return (
    <div className={containerClass} ref={chartRef}>
      <div className={styles.chartHeader}>
        <div className={styles.leftControls}>
          <div className={styles.controlGroup}>
            <select
              className={styles.variationsSelect}
              value={
                selectedVariations.length === data.variations.length 
                  ? 'all' 
                  : selectedVariations[0] || 'all'
              }
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'all') {
                  setSelectedVariations(data.variations.map(v => getVariationKey(v)));
                } else {
                  // Выбираем только одну вариацию
                  setSelectedVariations([value]);
                }
              }}
            >
              <option value="all">All variations selected</option>
              {data.variations.map((variation) => {
                const key = getVariationKey(variation);
                return (
                  <option key={key} value={key}>
                    {getVariationName(variation)}
                  </option>
                );
              })}
            </select>
          </div>
          <div className={styles.controlGroup}>
            <select
              className={styles.timeRangeSelect}
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
            </select>
          </div>
        </div>
        <div className={styles.rightControls}>
          <div className={styles.controlGroup}>
            <select
              key={`lineStyle-${lineStyle}`}
              className={styles.lineStyleSelect}
              value={lineStyle}
              onChange={(e) => {
                const newStyle = e.target.value as LineStyle;
                setLineStyle(newStyle);
              }}
            >
              <option value="line">line style: line</option>
              <option value="smooth">line style: smooth</option>
              <option value="area">line style: area</option>
            </select>
          </div>
          <div className={styles.iconButtons}>
            <button
              className={styles.iconButton}
              onClick={exportToPNG}
              title="Export to PNG"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
            <button
              className={styles.iconButton}
              onClick={resetZoom}
              disabled={zoomLevel === 1}
              title="Reset Zoom"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </button>
            <button
              className={styles.iconButton}
              onClick={() => {
                const newTheme = theme === 'light' ? 'dark' : 'light';
                setTheme(newTheme);
                onThemeChange?.(newTheme);
              }}
              title={theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
            >
              {theme === 'light' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      <div className={styles.chartWrapper}>
        <div className={styles.zoomControls}>
          <button
            className={styles.zoomButton}
            onClick={handleZoomOut}
            disabled={zoomLevel <= 1}
            title="Zoom Out (-)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </button>
          <div className={styles.zoomSlider}>
            <div 
              ref={zoomTrackRef}
              className={styles.zoomTrack}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percentage = clickX / rect.width;
                const newZoomLevel = 1 + percentage * 4; // От 1 до 5
                setZoomLevel(Math.max(1, Math.min(newZoomLevel, 5)));
                setPanOffset(0);
              }}
            >
              <div 
                className={styles.zoomFill}
                style={{ width: `${((zoomLevel - 1) / 4) * 100}%` }}
              ></div>
              <div 
                className={styles.zoomThumb}
                style={{ left: `${((zoomLevel - 1) / 4) * 100}%` }}
                onMouseDown={handleSliderMouseDown}
              ></div>
            </div>
          </div>
          <button
            className={styles.zoomButton}
            onClick={handleZoomIn}
            disabled={zoomLevel >= 5}
            title="Zoom In (+)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </button>
        </div>
        <div 
          className={styles.chartArea}
          onMouseDown={handleChartMouseDown}
          style={{ cursor: zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
        >
          <ResponsiveContainer width="100%" height="100%">
            {lineStyle === 'area' ? (
              <ComposedChart
                data={displayData}
                margin={{ top: 5, right: 30, left: 20, bottom: 100 }}
                onMouseMove={(state) => {
                  if (!isPanning && !isDraggingSlider && state && state.activeTooltipIndex !== undefined) {
                    setHoveredIndex(state.activeTooltipIndex);
                  }
                }}
                onMouseLeave={() => {
                  if (!isPanning) {
                    setHoveredIndex(null);
                  }
                }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={theme === 'dark' ? '#444' : '#e0e0e0'} 
                />
                <XAxis
                  dataKey="date"
                  stroke={theme === 'dark' ? '#ccc' : '#666'}
                  tick={{ fontSize: 12, fill: theme === 'dark' ? '#ccc' : '#666' }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis
                  domain={yAxisDomain}
                  allowDataOverflow={false}
                  allowDecimals={true}
                  type="number"
                  stroke={theme === 'dark' ? '#ccc' : '#666'}
                  tick={{ fontSize: 12, fill: theme === 'dark' ? '#ccc' : '#666' }}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                />
                <Tooltip content={<CustomTooltip theme={theme} />} />
                {hoveredIndex !== null && displayData[hoveredIndex] && (
                  <ReferenceLine
                    x={displayData[hoveredIndex].date}
                    stroke={theme === 'dark' ? '#888' : '#999'}
                    strokeDasharray="2 2"
                    strokeWidth={1}
                  />
                )}
                {selectedVariations.map((variationKey, index) => {
                  const variation = data.variations.find(
                    (v) => getVariationKey(v) === variationKey
                  );
                  if (!variation) return null;

                  const color = COLORS[index % COLORS.length];
                  const lineType = getLineType();
                  
                  return (
                    <Area
                      key={variationKey}
                      type={lineType}
                      dataKey={variationKey}
                      name={getVariationName(variation)}
                      stroke={color}
                      fill={color}
                      fillOpacity={0.3}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                  );
                })}
              </ComposedChart>
            ) : (
              <LineChart
                data={displayData}
                margin={{ top: 5, right: 30, left: 20, bottom: 100 }}
                onMouseMove={(state) => {
                  if (!isPanning && !isDraggingSlider && state && state.activeTooltipIndex !== undefined) {
                    setHoveredIndex(state.activeTooltipIndex);
                  }
                }}
                onMouseLeave={() => {
                  if (!isPanning) {
                    setHoveredIndex(null);
                  }
                }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={theme === 'dark' ? '#444' : '#e0e0e0'} 
                />
                <XAxis
                  dataKey="date"
                  stroke={theme === 'dark' ? '#ccc' : '#666'}
                  tick={{ fontSize: 12, fill: theme === 'dark' ? '#ccc' : '#666' }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis
                  domain={yAxisDomain}
                  allowDataOverflow={false}
                  allowDecimals={true}
                  type="number"
                  stroke={theme === 'dark' ? '#ccc' : '#666'}
                  tick={{ fontSize: 12, fill: theme === 'dark' ? '#ccc' : '#666' }}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                />
                <Tooltip content={<CustomTooltip theme={theme} />} />
                {hoveredIndex !== null && displayData[hoveredIndex] && (
                  <ReferenceLine
                    x={displayData[hoveredIndex].date}
                    stroke={theme === 'dark' ? '#888' : '#999'}
                    strokeDasharray="2 2"
                    strokeWidth={1}
                  />
                )}
                {selectedVariations.map((variationKey, index) => {
                  const variation = data.variations.find(
                    (v) => getVariationKey(v) === variationKey
                  );
                  if (!variation) return null;

                  const color = COLORS[index % COLORS.length];
                  const lineType = getLineType();
                  const isSmooth = lineStyle === 'smooth';
                  
                  return (
                    <Line
                      key={variationKey}
                      type={lineType}
                      dataKey={variationKey}
                      name={getVariationName(variation)}
                      stroke={color}
                      strokeWidth={isSmooth ? 2.5 : 2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                  );
                })}
              </LineChart>
            )}
        </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
