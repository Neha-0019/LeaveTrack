# Change Loop Log

**Feature Request:** "Add half-day leave support — a leave request can specify is_half_day (boolean) applying to either the start_date or end_date, and balance deduction/overlap logic must account for 0.5-day units instead of always treating a day as a full day."

## Ambiguity Resolution
- **Half-day fields:** The prompt mentions `is_half_day (boolean) applying to either the start_date or end_date` and later asks about `both start_date and end_date of a single-day leave`. To support half-days on either or both ends of a multi-day leave, I will introduce two booleans: `half_day_start` and `half_day_end`.
- **Single-day leave rule:** If a leave is just 1 day long, and both `half_day_start` and `half_day_end` are True, that implies the user is taking a half day in the morning and a half day in the afternoon — which equals 1 full day. I will implement the rule such that a single-day leave with both flags True is treated as 1 full day (or optionally just blocked as redundant, but treating it as 1 full day is mathematically sound: 1 day - 0.5 (start) - 0.5 (end) = 0? Wait, if they take the first half and second half, they took the whole day. A standard day is 1. If half_day_start is True, we subtract 0.5. If half_day_end is True, we subtract 0.5. So 1 - 0.5 - 0.5 = 0 days? No, a single day is 1 day. If they request 1 day and both are half days, the requested amount is 0 days? That makes no sense. The rule will be: If `start_date == end_date`, you can only set `half_day_start = True`. Setting both to True on the same day is invalid.)

## Iteration 1
**Goal:** Update `app.py` schema (`REAL` for `leave_balance`, new boolean columns) and deduction logic. Run existing tests.
**Result:** Passed. The original test suite still passes seamlessly because Python dynamically handles floats and ints in comparisons, and we used default False/0 values for the new DB columns.

## Iteration 2
**Goal:** Add 3 specific tests for half-day leaves (overlap, deduction to 19.5, invalid single day) and run `run_loop.py`.
**Result:** Passed perfectly on the first try. The Python overlap logic successfully isolates non-overlapping half-days on the exact same date.
