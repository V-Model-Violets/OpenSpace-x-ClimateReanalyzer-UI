// Custom Calendar Picker for OpenSpace Compatibility
// Works without HTML5 date input dependencies

class CalendarPicker {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.selectedDate = null;
    this.currentMonth = new Date().getMonth();
    this.currentYear = new Date().getFullYear();
    this.minYear = options.minYear || 1900;
    this.maxYear = options.maxYear || new Date().getFullYear() + 10;
    this.onDateSelect = options.onDateSelect || (() => {});

    this.monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    this.init();
  }

  init() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(
        `Calendar container with ID '${this.containerId}' not found`,
      );
      return;
    }

    container.className = "calendar-picker";
    container.innerHTML = this.generateCalendarHTML();
    this.attachEventListeners();
    this.renderCalendar();
  }

  generateCalendarHTML() {
    return `
      <div class="calendar-header">
        <button class="calendar-nav-btn" id="prevMonth">&lt;</button>
        <div class="calendar-title">
          <select class="month-select" id="monthSelect">
            ${this.monthNames
              .map(
                (month, index) =>
                  `<option value="${index}" ${index === this.currentMonth ? "selected" : ""}>${month}</option>`,
              )
              .join("")}
          </select>
          <select class="year-select" id="yearSelect">
            ${Array.from(
              { length: this.maxYear - this.minYear + 1 },
              (_, i) => this.minYear + i,
            )
              .map(
                (year) =>
                  `<option value="${year}" ${year === this.currentYear ? "selected" : ""}>${year}</option>`,
              )
              .join("")}
          </select>
        </div>
        <button class="calendar-nav-btn" id="nextMonth">&gt;</button>
      </div>
      <div class="calendar-body">
        <div class="calendar-weekdays">
          <div class="calendar-weekday">Sun</div>
          <div class="calendar-weekday">Mon</div>
          <div class="calendar-weekday">Tue</div>
          <div class="calendar-weekday">Wed</div>
          <div class="calendar-weekday">Thu</div>
          <div class="calendar-weekday">Fri</div>
          <div class="calendar-weekday">Sat</div>
        </div>
        <div class="calendar-days" id="calendarDays"></div>
      </div>
      <div class="calendar-footer">
        <div class="selected-date" id="selectedDateDisplay">No date selected</div>
      </div>
    `;
  }

  attachEventListeners() {
    const container = document.getElementById(this.containerId);

    // Navigation buttons
    container
      .querySelector("#prevMonth")
      .addEventListener("click", () => this.previousMonth());
    container
      .querySelector("#nextMonth")
      .addEventListener("click", () => this.nextMonth());

    // Dropdown selects
    container.querySelector("#monthSelect").addEventListener("change", (e) => {
      this.currentMonth = parseInt(e.target.value);
      this.renderCalendar();
    });

    container.querySelector("#yearSelect").addEventListener("change", (e) => {
      this.currentYear = parseInt(e.target.value);
      this.renderCalendar();
    });
  }

  previousMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.updateSelects();
    this.renderCalendar();
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.updateSelects();
    this.renderCalendar();
  }

  updateSelects() {
    const monthSelect = document.getElementById("monthSelect");
    const yearSelect = document.getElementById("yearSelect");

    if (monthSelect) monthSelect.value = this.currentMonth;
    if (yearSelect) yearSelect.value = this.currentYear;
  }

  renderCalendar() {
    const daysContainer = document.getElementById("calendarDays");
    if (!daysContainer) return;

    daysContainer.innerHTML = "";

    // Get first day of the month and number of days
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const daysInMonth = new Date(
      this.currentYear,
      this.currentMonth + 1,
      0,
    ).getDate();

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      const emptyCell = document.createElement("div");
      emptyCell.className = "calendar-day empty";
      daysContainer.appendChild(emptyCell);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement("div");
      dayCell.className = "calendar-day";
      dayCell.textContent = day;

      // Check if this is the selected date
      if (
        this.selectedDate &&
        this.selectedDate.getDate() === day &&
        this.selectedDate.getMonth() === this.currentMonth &&
        this.selectedDate.getFullYear() === this.currentYear
      ) {
        dayCell.classList.add("selected");
      }

      // Add today highlighting
      const today = new Date();
      if (
        today.getDate() === day &&
        today.getMonth() === this.currentMonth &&
        today.getFullYear() === this.currentYear
      ) {
        dayCell.classList.add("today");
      }

      dayCell.addEventListener("click", () => this.selectDate(day));
      daysContainer.appendChild(dayCell);
    }
  }

  selectDate(day) {
    this.selectedDate = new Date(this.currentYear, this.currentMonth, day);

    // Update display
    const display = document.getElementById("selectedDateDisplay");
    if (display) {
      display.textContent = `Selected: ${this.formatDate(this.selectedDate)}`;
    }

    // Remove previous selection and add to new
    const allDays = document.querySelectorAll(".calendar-day");
    allDays.forEach((d) => d.classList.remove("selected"));
    event.target.classList.add("selected");

    // Call callback
    this.onDateSelect(this.selectedDate);
  }

  formatDate(date) {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  getValue() {
    return this.formatDate(this.selectedDate);
  }

  setValue(dateString) {
    if (!dateString) {
      this.selectedDate = null;
      return;
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return;

    this.selectedDate = date;
    this.currentMonth = date.getMonth();
    this.currentYear = date.getFullYear();
    this.updateSelects();
    this.renderCalendar();
  }
}

// Global calendar instances
window.calendarPickers = {};

// Helper function to create calendar picker
function createCalendarPicker(containerId, options = {}) {
  const picker = new CalendarPicker(containerId, options);
  window.calendarPickers[containerId] = picker;
  return picker;
}
