# 🕒 Hilan to Malam Timesheet Sync

A Chrome extension that automatically copies work hours from Hilan timesheet to Malam payroll system with intelligent auto-clicking and seamless one-click sync.

![Extension Demo](icons/icon128.png)

## ✨ What it does

This extension eliminates the tedious manual work of copying shift times between two systems:

- **🔄 Auto-Click**: Automatically reveals all work time boxes in Hilan calendar
- **📋 From Hilan**: Reads your actual clock-in and clock-out times
- **📝 To Malam**: Automatically fills the payroll timesheet
- **⚡ One Click**: Sync entire timesheet in seconds
- **📊 Smart Analytics**: Tracks operations and success rates

Perfect for employees who need to submit the same work hours to both systems.

## 💬 Found an Issue?

If you encounter any problems or have suggestions for improvement, please let us know!

[![Report Issue](https://img.shields.io/badge/Report%20Issue-GitHub-red?style=for-the-badge&logo=github)](../../issues/new)

Click the button above to report bugs, request features, or ask questions.

## 🚀 Installation

1. **Download this extension**

   - Click the green "Code" button → "Download ZIP"
   - Extract the ZIP file to a folder on your computer

2. **Install in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top-right toggle)
   - Click "Load unpacked" and select the extracted folder
   - The extension icon will appear in your toolbar

## 📖 How to Use

### Simple 3-Step Process:

1. **Open Hilan timesheet** in Chrome

   - Navigate to: `https://[company].hilan.co.il/Hilannetv2/Attendance/`
   - Ensure you're on the timesheet calendar page

2. **Auto-Click Time Boxes** (Recommended first step)

   - Click the extension icon and press "🔄 Auto-Click Time Boxes"
   - ✅ Success message: **"Successfully clicked X of Y time boxes"**
   - This reveals all your work times in the calendar for better data extraction

3. **Copy from Hilan**

   - Press "📋 Copy Hours" in the extension popup
   - ✅ Success message: **"Successfully copied X entries from Hilan timesheet"**

4. **Paste to Malam**
   - Open Malam payroll: `https://payroll.malam.com/Salprd5Root/faces/...`
   - Click the extension icon and press "📝 Paste Hours"
   - ✅ Success message: **"Successfully pasted X entries to Malam timesheet"**

**That's it!** Your shift times are now synchronized automatically.

## 💡 Key Features

### Core Functionality

- **🔄 Smart Auto-Click**: Automatically clicks only valid time boxes, skips empty days
- **🎯 Exact Times**: Copies your actual clock-in/out times
- **🌙 Night Shifts**: Handles shifts that cross midnight perfectly
- **📅 Smart Dates**: Automatically converts date formats between systems
- **📍 Saturday Support**: Includes Saturday and Holiday shifts when they contain valid work times

### User Experience

- **🎛️ Toggle Control**: Enable/disable extension via popup interface
- **📊 Real-time Analytics**: Tracks usage statistics and success rates
- **⚡ Fast Performance**: Optimized code processes entire month in seconds
- **🔒 Privacy-First**: All processing happens locally in your browser
- **💬 Clear Feedback**: Detailed success/error messages for every operation

### Technical Excellence

- **🛡️ Error Prevention**: Validates data before processing
- **🔄 Operation Safety**: Prevents multiple simultaneous operations
- **📈 Success Tracking**: Monitors operation success rates
- **🗂️ Data Management**: Built-in data clearing functionality

## 🌐 Supported Websites

### Hilan Timesheet

- **Domain**: `*.hilan.co.il`
- **Required Paths**:
  - `/Hilannetv2/Attendance/`
  - `/Hilannetv2/attendance/`
- **Functionality**: Auto-click time boxes, copy timesheet data

### Malam Payroll

- **Domain**: `payroll.malam.com`
- **Required Paths**: `/Salprd5Root/faces/`
- **Functionality**: Paste timesheet data to payroll forms

## ⚠️ Important Notes

- **Browser Compatibility**: Chrome and Microsoft Edge (Chromium-based)
- **Tab Management**: Keep both Hilan and Malam tabs open during sync
- **Authentication**: Ensure you're logged into both systems
- **Data Verification**: Always verify copied data before submitting in Malam
- **Language Support**: Works with Hebrew and English interfaces
- **Extension State**: Can be toggled on/off via the popup interface

## 🔧 Extension Controls

### Main Interface

- **Extension Toggle**: Enable/disable all functionality
- **Auto-Click Button**: "🔄 Auto-Click Time Boxes" (Hilan only)
- **Sync Button**:
  - "📋 Copy Hours" (when on Hilan)
  - "📝 Paste Hours" (when on Malam)
  - "Sync Hours" (default/unknown site)

### Analytics Dashboard

- **Statistics Toggle**: Show/hide detailed analytics
- **Usage Tracking**: Last operation times with counts
- **Success Monitoring**: Real-time success rate calculation
- **Data Management**: Clear all extension data option

## 🐛 Troubleshooting

### Auto-Click Issues

**❌ "No clickable time boxes found"**

- Ensure you're on the Hilan timesheet calendar page
- Check that the URL contains `/Hilannetv2/Attendance/` or `/Hilannetv2/attendance/`
- Verify you're logged into Hilan and can see the calendar

### Copy Operation Issues

**❌ "No timesheet entries found"**

- Use "Auto-Click Time Boxes" first to reveal all work times
- Ensure you're on the correct Hilan timesheet page with visible work hours
- Verify the calendar shows actual time data (not just empty boxes)
- Try refreshing the Hilan page and running auto-click again

### Paste Operation Issues

**❌ "No timesheet data found to paste"**

- Copy from Hilan first using "Copy Hours" button
- Ensure the copy operation showed a success message
- Verify you're on the correct Malam timesheet page

**❌ "No matching dates found"**

- Ensure the Malam timesheet covers the same date range as your Hilan data
- Check that date formats are compatible between systems
- Verify you're on the correct Malam payroll page

### General Issues

**❌ "Extension is disabled"**

- Check the extension toggle in the popup (should show "Extension Enabled")
- Ensure the extension is enabled in `chrome://extensions/`

**❌ "This feature is not available on the current website"**

- Verify you're on a supported website (Hilan or Malam)
- Check that the URL matches the supported paths exactly

**❌ "Another operation is in progress"**

- Wait for the current operation to complete
- If stuck, refresh the page and try again

## 🔒 Privacy & Security

### Data Protection

- ✅ **Zero External Transmission**: No data sent to external servers
- ✅ **Local Processing**: All operations happen in your browser
- ✅ **No Tracking**: No analytics sent to third parties
- ✅ **Offline Capable**: Works completely offline after installation
- ✅ **Minimal Permissions**: Only accesses specified timesheet websites

### Storage & Analytics

- ✅ **Local Storage Only**: All data stored in Chrome's local storage
- ✅ **User Control**: Complete data clearing capability
- ✅ **Temporary Data**: Timesheet data stored only for transfer purposes
- ✅ **Usage Analytics**: Optional local statistics (can be disabled)

## 📈 Analytics & Statistics

The extension tracks local usage statistics to help improve your experience:

### Tracked Data

- **Operation Counts**: Copy, paste, and auto-click totals
- **Success Rates**: Real-time calculation of operation success
- **Last Operations**: Timestamps of recent activities with counts
- **Error Tracking**: Failed operation counts for troubleshooting

### Data Control

- **Toggle Display**: Statistics can be shown/hidden via popup
- **Complete Clearing**: All data can be deleted via "Clear All Data" button
- **Local Only**: All analytics remain on your device

## 🔧 Technical Details

### Browser Requirements

- **Chrome**: Version 88+ (Manifest V3 support)
- **Microsoft Edge**: Version 88+ (Chromium-based)
- **Permissions**: `storage`, `activeTab`, `scripting`

### Supported Data Formats

- **Time Format**: HH:MM (24-hour format)
- **Date Format**: DD/MM/YYYY (Hilan) → DD/MM/YYYY (Malam)
- **Encoding**: UTF-8 (supports Hebrew and English text)

## 📄 License

This project is licensed under the **GPL-3.0 License** — see the [![License: GPL-3.0-or-later](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://github.com/IIMrRobotII/Timesheet-Helper?tab=GPL-3.0-1-ov-file) file for details.

### GPL-3.0 License Summary

- ✅ **Freedom to Use**: Use the software for any purpose
- ✅ **Freedom to Study**: Access and modify the source code
- ✅ **Freedom to Share**: Distribute copies of the software
- ✅ **Freedom to Modify**: Distribute modified versions
- ⚖️ **Copyleft**: Derivative works must also be licensed under GPL-3.0
- 🔒 **No Warranty**: Software is provided "as is" without warranty

This ensures the extension remains free and open-source for everyone.

---

**Made with ❤️ for employees who want to save time on timesheet management**
