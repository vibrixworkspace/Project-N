# NeuroVoice Thrive 2026

> An accessible, child-focused communication and support interface
> designed to help caregivers track observations, routines,
> communication activities, and developmental progress.

## 🌟 Overview

**NeuroVoice Thrive 2026** is a frontend web application created to
provide a simple and accessible digital interface for caregivers and
support professionals.

The current frontend includes:

-   👤 Child profile management
-   📝 Observation and journal tracking
-   💬 Communication cards
-   📅 Schedule and routine support
-   📊 Progress and activity information
-   🧩 Accessible, child-friendly interaction patterns
-   💾 Browser-based local data storage

## 🛠️ Technology Stack

-   **HTML5**
-   **CSS3**
-   **Vanilla JavaScript**
-   **JSON**
-   **LocalStorage API**

No frontend framework or build system is required.

## 📁 Project Structure

``` text
frontend/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   └── data.js
└── data/
    ├── children.json
    ├── communication_cards.json
    ├── observations.json
    └── schedule.json
```

## 🚀 Running Locally

Because this is a static frontend, it can be opened directly in a
browser.

For the best experience, use a local development server.

### Using VS Code

1.  Open the `frontend` folder in VS Code.
2.  Install the **Live Server** extension.
3.  Right-click `index.html`.
4.  Select **Open with Live Server**.

### Using Python

From inside the `frontend` directory:

``` bash
python -m http.server 8000
```

Then open:

``` text
http://localhost:8000
```

## ☁️ Deployment on Vercel

This project can be deployed as a static website on Vercel.

### Recommended Vercel settings

  Setting            Value
  ------------------ -------------
  Framework Preset   Other
  Root Directory     `frontend`
  Build Command      Leave empty
  Output Directory   Leave empty
  Install Command    Leave empty

The application entry point is:

``` text
frontend/index.html
```

## 💾 Data Storage

The current frontend uses the browser's **LocalStorage** for
user-created data.

This means:

-   Data is stored locally in the user's browser.
-   Data is not automatically synchronized between devices.
-   Clearing browser storage can remove locally stored data.
-   A production version would require a secure backend and database.

The JSON files in the `data/` directory provide the application's
initial/static data.

## 🔐 Production Considerations

This project is currently a frontend prototype/demo.

For production deployment involving real users and sensitive
information, the application should add:

-   Secure authentication and authorization
-   Backend APIs
-   Encrypted database storage
-   Role-based access control
-   Secure data transmission
-   Proper privacy and consent mechanisms
-   Input validation and sanitization
-   Audit logging
-   Appropriate protection of child-related data

## 🎯 Project Goals

NeuroVoice Thrive 2026 aims to make digital support tools:

-   **Accessible**
-   **Simple to use**
-   **Caregiver-friendly**
-   **Structured**
-   **Scalable**
-   **Privacy-conscious**

## 🧪 Current Status

**Frontend:** Ready for static deployment

**Backend:** Not included in the current frontend repository

**Database:** Not included

**Authentication:** Not included

## 👥 Intended Users

The interface is designed as a prototype for:

-   Caregivers
-   Parents and guardians
-   Educators
-   Therapists and support professionals
-   Hackathon/project demonstrations

## 📌 Disclaimer

This project is a technology prototype and is **not a medical diagnostic
or treatment system**. Information displayed by the application should
not be treated as professional medical advice.

## 📄 License

Add the project's chosen license here before public distribution.
