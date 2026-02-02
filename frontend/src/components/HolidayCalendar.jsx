import { useState, useMemo } from 'react';
import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi';

const HolidayCalendar = ({ holidays = [] }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const startDay = firstDayOfMonth.getDay();
        const daysInMonth = lastDayOfMonth.getDate();
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        const days = [];

        for (let i = startDay - 1; i >= 0; i--) {
            days.push({ date: new Date(year, month - 1, prevMonthLastDay - i), isCurrentMonth: false, day: prevMonthLastDay - i });
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ date: new Date(year, month, i), isCurrentMonth: true, day: i });
        }
        // Always use 42 cells for consistent square shape
        for (let i = 1; days.length < 42; i++) {
            days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false, day: i });
        }
        return days;
    }, [year, month]);

    const holidayMap = useMemo(() => {
        const map = {};
        holidays.forEach(h => {
            const d = new Date(h.date);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            if (!map[key]) map[key] = [];
            map[key].push(h);
        });
        return map;
    }, [holidays]);

    const getHoliday = (date) => holidayMap[`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`] || null;
    const isToday = (date) => date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();

    return (
        <div className="card w-72 h-72 flex flex-col">
            {/* Header */}
            <div className="px-3 py-2 border-b border-secondary-100 flex items-center justify-between flex-shrink-0">
                <span className="font-semibold text-secondary-900 text-sm">{monthNames[month]} {year}</span>
                <div className="flex items-center gap-1">
                    <button onClick={() => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDate(null); }} className="p-1 hover:bg-secondary-100 rounded">
                        <HiOutlineChevronLeft className="w-4 h-4 text-secondary-500" />
                    </button>
                    <button onClick={() => { setCurrentDate(new Date()); setSelectedDate(null); }} className="px-2 py-0.5 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded">
                        Today
                    </button>
                    <button onClick={() => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDate(null); }} className="p-1 hover:bg-secondary-100 rounded">
                        <HiOutlineChevronRight className="w-4 h-4 text-secondary-500" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 p-2 flex flex-col">
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1">
                    {dayNames.map((d, i) => (
                        <div key={i} className="text-center text-xs font-medium text-secondary-400">{d}</div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 flex-1 gap-0.5">
                    {calendarDays.map((dayInfo, i) => {
                        const holiday = getHoliday(dayInfo.date);
                        const isTodayDate = isToday(dayInfo.date);
                        return (
                            <button
                                key={i}
                                onClick={() => holiday ? setSelectedDate({ date: dayInfo.date, holidays: holiday }) : setSelectedDate(null)}
                                className={`
                                    relative flex items-center justify-center rounded text-xs transition-colors
                                    ${!dayInfo.isCurrentMonth ? 'text-secondary-300' : 'text-secondary-600'}
                                    ${isTodayDate ? 'bg-primary-600 text-white font-bold' : ''}
                                    ${holiday && !isTodayDate && dayInfo.isCurrentMonth ? 'bg-green-100 text-green-700 font-semibold' : ''}
                                    ${!holiday && !isTodayDate && dayInfo.isCurrentMonth ? 'hover:bg-secondary-100' : ''}
                                `}
                            >
                                {dayInfo.day}
                                {holiday && dayInfo.isCurrentMonth && (
                                    <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isTodayDate ? 'bg-white' : 'bg-green-600'}`}></span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="px-2 pb-2 flex items-center gap-3 text-xs text-secondary-500 flex-shrink-0">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary-600"></span>Today</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>Holiday</div>
            </div>

            {/* Selected Holiday Tooltip */}
            {selectedDate?.holidays && (
                <div className="absolute top-full left-0 mt-1 z-10 bg-green-50 border border-green-200 rounded-lg p-2 text-xs shadow-lg">
                    <p className="font-medium text-green-800">{selectedDate.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    {selectedDate.holidays.map((h, i) => <p key={i} className="text-green-700">{h.name}</p>)}
                </div>
            )}
        </div>
    );
};

export default HolidayCalendar;
