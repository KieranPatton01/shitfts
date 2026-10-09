import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MonthView } from './MonthView';
import { WeekDocument } from '../types';

describe('MonthView Component Rendering', () => {
  const dummyWeekDoc = (isoWeekId: string): WeekDocument => ({
    id: isoWeekId,
    coupleId: 'cpl_test',
    members: ['uid_you', 'uid_partner'],
    year: 2026,
    weekNumber: parseInt(isoWeekId.split('-W')[1], 10),
    startDate: '2026-10-12',
    endDate: '2026-10-18',
    schedules: {
      You: {
        submitted: true,
        submittedAt: 1234,
        lastUpdatedAt: 1234,
        days: {
          wed: {
            date: '2026-10-14',
            dayOfWeek: 'wed',
            status: 'free'
          },
          thu: {
            date: '2026-10-15',
            dayOfWeek: 'thu',
            status: 'work',
            customHours: '9:00 AM – 5:30 PM'
          },
          fri: {
            date: '2026-10-16',
            dayOfWeek: 'fri',
            status: 'work',
            customHours: '9:00 AM – 5:30 PM'
          }
        } as any
      },
      Alex: {
        submitted: true,
        submittedAt: 1234,
        lastUpdatedAt: 1234,
        days: {
          wed: {
            date: '2026-10-14',
            dayOfWeek: 'wed',
            status: 'free'
          },
          thu: {
            date: '2026-10-15',
            dayOfWeek: 'thu',
            status: 'free'
          },
          fri: {
            date: '2026-10-16',
            dayOfWeek: 'fri',
            status: 'work',
            customHours: '9:00 AM – 5:30 PM'
          }
        } as any
      }
    }
  });

  const weeksMap: Record<string, WeekDocument> = {
    '2026-W40': dummyWeekDoc('2026-W40'),
    '2026-W41': dummyWeekDoc('2026-W41'),
    '2026-W42': dummyWeekDoc('2026-W42'),
    '2026-W43': dummyWeekDoc('2026-W43'),
    '2026-W44': dummyWeekDoc('2026-W44')
  };

  it('renders the entire month with headers and day cells', () => {
    const html = renderToStaticMarkup(
      <MonthView
        year={2026}
        monthIndex={9} // October 2026
        todayStr="2026-10-14"
        weeksMap={weeksMap}
        myRules={[]}
        partnerRules={[]}
        myName="You"
        partnerName="Alex"
        isPaired={true}
        onPrevMonth={() => {}}
        onNextMonth={() => {}}
        onJumpToCurrentMonth={() => {}}
        onEditDayShift={() => {}}
        onGoToWeek={() => {}}
      />
    );

    // Weekday column headers
    expect(html).toContain('Mon');
    expect(html).toContain('Tue');
    expect(html).toContain('Wed');
    expect(html).toContain('Thu');
    expect(html).toContain('Fri');
    expect(html).toContain('Sat');
    expect(html).toContain('Sun');
  });

  it('greys out days in the past (bg-slate-100)', () => {
    const html = renderToStaticMarkup(
      <MonthView
        year={2026}
        monthIndex={9}
        todayStr="2026-10-14"
        weeksMap={weeksMap}
        myRules={[]}
        partnerRules={[]}
        myName="You"
        partnerName="Alex"
        isPaired={true}
        onPrevMonth={() => {}}
        onNextMonth={() => {}}
        onJumpToCurrentMonth={() => {}}
        onEditDayShift={() => {}}
        onGoToWeek={() => {}}
      />
    );

    // Days before today (e.g. 2026-10-05) have past greyed out styling
    expect(html).toContain('bg-slate-100');
  });

  it('renders unentered days as white (bg-white)', () => {
    const html = renderToStaticMarkup(
      <MonthView
        year={2026}
        monthIndex={9}
        todayStr="2026-10-14"
        weeksMap={{}} // Empty weeks -> all unentered
        myRules={[]}
        partnerRules={[]}
        myName="You"
        partnerName="Alex"
        isPaired={true}
        onPrevMonth={() => {}}
        onNextMonth={() => {}}
        onJumpToCurrentMonth={() => {}}
        onEditDayShift={() => {}}
        onGoToWeek={() => {}}
      />
    );

    // Days not yet inputted are white
    expect(html).toContain('bg-white');
  });

  it('renders availability information on inputted days', () => {
    const html = renderToStaticMarkup(
      <MonthView
        year={2026}
        monthIndex={9}
        todayStr="2026-10-14"
        weeksMap={weeksMap}
        myRules={[]}
        partnerRules={[]}
        myName="You"
        partnerName="Alex"
        isPaired={true}
        onPrevMonth={() => {}}
        onNextMonth={() => {}}
        onJumpToCurrentMonth={() => {}}
        onEditDayShift={() => {}}
        onGoToWeek={() => {}}
      />
    );

    // Both free on Wednesday (2026-10-14)
    expect(html).toContain('✨ Both free');

    // Alex free on Thursday (2026-10-15)
    expect(html).toContain('☀️ Alex free');

    // Evening overlap on Friday (2026-10-16)
    expect(html).toContain('🌙 Eve free');
  });

  it('greys out past days cleanly without displaying availability badges on the grid', () => {
    // In dummyWeekDoc, wed (2026-10-14) is today, but if today is set to 2026-10-20,
    // then 2026-10-14 is in the past
    const html = renderToStaticMarkup(
      <MonthView
        year={2026}
        monthIndex={9}
        todayStr="2026-10-20" // 14, 15, 16 are in the past
        weeksMap={{ '2026-W42': dummyWeekDoc('2026-W42') }}
        myRules={[]}
        partnerRules={[]}
        myName="You"
        partnerName="Alex"
        isPaired={true}
        onPrevMonth={() => {}}
        onNextMonth={() => {}}
        onJumpToCurrentMonth={() => {}}
        onEditDayShift={() => {}}
        onGoToWeek={() => {}}
      />
    );

    // Past cells should have past greyed out styling
    expect(html).toContain('bg-slate-100');
    // And past cells should not contain the availability badge text
    expect(html).not.toContain('✨ Both free');
    expect(html).not.toContain('☀️ Alex free');
  });

  it('renders padding cells as interactive buttons to navigate adjacent months', () => {
    const html = renderToStaticMarkup(
      <MonthView
        year={2026}
        monthIndex={9} // October 2026 starts with padding from September
        todayStr="2026-10-14"
        weeksMap={{}}
        myRules={[]}
        partnerRules={[]}
        myName="You"
        partnerName="Alex"
        isPaired={true}
        onPrevMonth={() => {}}
        onNextMonth={() => {}}
        onJumpToCurrentMonth={() => {}}
        onEditDayShift={() => {}}
        onGoToWeek={() => {}}
      />
    );

    // Padding cell for 2026-09-28 has an aria-label and button element
    expect(html).toContain('aria-label="Go to 2026-09-28"');
  });

  it('handles unpaired users gracefully without partner free counter or misleading copy', () => {
    const html = renderToStaticMarkup(
      <MonthView
        year={2026}
        monthIndex={9}
        todayStr="2026-10-14"
        weeksMap={weeksMap}
        myRules={[]}
        partnerRules={[]}
        myName="You"
        partnerName="Partner"
        isPaired={false}
        onPrevMonth={() => {}}
        onNextMonth={() => {}}
        onJumpToCurrentMonth={() => {}}
        onEditDayShift={() => {}}
        onGoToWeek={() => {}}
      />
    );

    // Unpaired users render days normally without partner availability labels
    expect(html).toContain('Mon');
    expect(html).not.toContain('☀️ Partner free');
  });
});
