# My Study Planner

A complete study website for managing semester exam preparation.
No installation, no server, no database. Just plain HTML, CSS and JavaScript.

## How to run

1. Unzip the folder.
2. Double-click `index.html` (it opens in your browser).

That's it. Your data is saved automatically in your browser (localStorage).

## What is inside

| Page | What you can do |
|------|-----------------|
| Dashboard | Motivation quote, task progress, exam countdown, today's tasks and study plan |
| Subjects & Exams | Add each subject with its exam date, priority and colour |
| Tasks | Add tasks per subject with due date and priority, tick them off, filter them |
| Schedule | Add weekly study blocks, or press **Generate plan** to make a full week automatically |
| Focus Timer | Pomodoro timer (default 25 min focus / 5 min break) with a daily session count |
| Notification menu (bell) | Overdue and today's tasks (with a **Done** button), today's study blocks, upcoming exams, a motivation line |

## Quick start (suggested)

1. Go to **Subjects & Exams** and add every subject with its exam date.
2. Go to **Tasks** and add chapters or topics as tasks with due dates.
3. Go to **Schedule**, set your start time and session length, press **Generate plan**.
4. Each day, click the 🔔 bell and finish what is listed under *Complete today*.

## Pop-up alerts

Click the bell, then **Enable alerts**. The browser will then show a pop-up when a study
block starts and a daily summary of tasks. These work while the page is open in a tab.

## Backup

Use **Backup data** in the sidebar to download a `.json` file. **Restore data** loads it again
(useful when moving to another device or browser).

## Putting it online (optional)

Upload the folder to any static host: Netlify Drop, GitHub Pages or Vercel.
Each device/browser keeps its own data, so use Backup / Restore to move it.

## Customising

- Motivation lines: edit the `QUOTES` list at the top of `app.js`.
- Colours: edit the variables at the top of `style.css`.
- Default name in the greeting: click the name in the header, or change `name` in `defaultState()` in `app.js`.
