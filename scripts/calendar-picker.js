// Custom Calendar Picker for OpenSpace Compatibility
// Works without HTML5 date input dependencies

/**
 * CalendarPicker – An interactive calendar date-picker widget.
 *
 * Renders a fully styled month/year-navigation calendar inside a target DOM
 * element without relying on the native <input type="date"> element, ensuring
 * compatibility with embedded browsers (such as OpenSpace's Chromium CEF).
 *
 * @example
 *   const picker = new CalendarPicker("dateInput", {
 *     minYear: 1940,
 *     maxYear: 2030,
 *     onDateSelect: (date) => console.log(date.toISOString()),
 *   });
 *   const value = picker.getValue(); // e.g. "2026-03-04"
 */

class CalendarPicker {
  /**
   * @param {string} containerId - ID of the DOM element to render the calendar into.
   * @param {object} [options={}]
   * @param {number} [options.minYear=1900]   - Earliest year shown in the year dropdown.
   * @param {number} [options.maxYear]        - Latest year shown (defaults to 10 years ahead).
   * @param {Function} [options.onDateSelect] - Callback invoked with the selected Date object.
   */
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

    createCustomDropdown(
      container.querySelector("#monthSelect"),
      this.monthNames,
      this.currentMonth,
      (index) => {
        this.currentMonth = index;
        this.renderCalendar();
      }
    );

    const years = Array.from(
      { length: this.maxYear - this.minYear + 1 },
      (_, i) => (this.minYear + i).toString()
    );
    
    createCustomDropdown(
      container.querySelector("#yearSelect"),
      years,
      this.currentYear - this.minYear,
      (index) => {
        this.currentYear = this.minYear + index;
        this.renderCalendar();
      }
    );
  }

  /**
   * Builds and returns the full calendar HTML markup string.
   * Includes the month/year navigation header, weekday row, and the
   * day grid container (populated separately by renderCalendar).
   *
   * @returns {string} HTML string for the calendar widget.
   */
  generateCalendarHTML() {
    return `
      <div class="calendar-header">
        <button class="calendar-nav-btn" id="prevMonth">&lt;</button>
        <div class="calendar-title">
          <div class="custom-select" id="monthSelect"></div>
          <div class="custom-select" id="yearSelect"></div>
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

  /**
   * Wires up event listeners for the prev/next navigation buttons and the
   * month/year dropdown selects after the calendar HTML has been injected.
   */
  attachEventListeners() {
    const container = document.getElementById(this.containerId);

    // Navigation buttons
    container
      .querySelector("#prevMonth")
      .addEventListener("click", () => this.previousMonth());
    container
      .querySelector("#nextMonth")
      .addEventListener("click", () => this.nextMonth());

  }

  /**
   * Moves the calendar view back by one month, wrapping from January to
   * December of the previous year when necessary.
   */
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

  /**
   * Advances the calendar view by one month, wrapping from December to
   * January of the next year when necessary.
   */
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

  /**
   * Keeps the month and year <select> dropdowns in sync with the current
   * internal state after a prev/next navigation button is pressed.
   */
  updateSelects() {
    const monthSelect = document.getElementById("monthSelect");
    const yearSelect = document.getElementById("yearSelect");

    if (monthSelect) monthSelect.value = this.currentMonth;
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

      dayCell.addEventListener("click", (e) => this.selectDate(day, e));
      daysContainer.appendChild(dayCell);
    }
  }

  /**
   * Records the selected day, updates the displayed date string, highlights
   * the clicked cell, and fires the onDateSelect callback.
   *
   * @param {number} day - Day of the month that was clicked (1-based).
   * @param {MouseEvent} e - The click event object.
   */
  selectDate(day, e) {
    this.selectedDate = new Date(this.currentYear, this.currentMonth, day);

    // Update display
    const display = document.getElementById("selectedDateDisplay");
    if (display) {
      display.textContent = `Selected: ${this.formatDate(this.selectedDate)}`;
    }

    // Remove previous selection and add to new
    const allDays = document.querySelectorAll(".calendar-day");
    allDays.forEach((d) => d.classList.remove("selected"));
    const target = e.target;
    target.classList.add("selected");

    // Call callback
    this.onDateSelect(this.selectedDate);
  }

  /**
   * Formats a Date object into the "YYYY-MM-DD" string format used
   * by the rest of the application.
   *
   * @param {Date|null} date
   * @returns {string}
   */
  formatDate(date) {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Returns the currently selected date as a "YYYY-MM-DD" string,
   * or an empty string if no date has been selected.
   *
   * @returns {string}
   */
  getValue() {
    return this.formatDate(this.selectedDate);
  }

  /**
   * Programmatically selects a date by its "YYYY-MM-DD" string value,
   * navigating the calendar view to that month and re-rendering.
   * Passing null or an empty string clears the selection.
   *
   * @param {string|null} dateString - Date in "YYYY-MM-DD" format.
   */
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

// Global registry of CalendarPicker instances keyed by container ID
window.calendarPickers = {};

/**
 * Factory function that creates a CalendarPicker, registers it globally,
 * and returns it. Preferred over constructing CalendarPicker directly so
 * that instances can be retrieved by other scripts via window.calendarPickers.
 *
 * @param {string} containerId - ID of the target DOM element.
 * @param {object} [options={}] - Options forwarded to the CalendarPicker constructor.
 * @returns {CalendarPicker}
 */
function createCalendarPicker(containerId, options = {}) {
  const picker = new CalendarPicker(containerId, options);
  window.calendarPickers[containerId] = picker;
  return picker;
}

//This makes sure that clicking off drop down makes it dissapear
document.addEventListener("click", () => {
  document.querySelectorAll(".custom-select .options").forEach((list) => {
    list.style.display = "none";
  });
});

/* OpenSpace does not work with the baseline selector. This is a function to resolve that issue */
function createCustomDropdown(container, items, selectedIndex, onChange) {
  /*ensure base class exists but don't overwrite others*/
  container.classList.add("custom-select");

  const selected = document.createElement("div");
  selected.className = "selected";
  selected.textContent = items[selectedIndex] ?? items[0];

  const list = document.createElement("div");
  list.className = "options";
  list.style.display = "none";

  items.forEach((item, index) => {
    const option = document.createElement("div");
    option.textContent = item;

    option.addEventListener("click", () => {
      selected.textContent = item;
      list.style.display = "none";
      onChange(index);
    });

    list.appendChild(option);
  });

  selected.addEventListener("click", (e) => {
    e.stopPropagation();
    list.style.display = list.style.display === "block" ? "none" : "block";
  });

  container.innerHTML = "";
  container.appendChild(selected);
  container.appendChild(list);
}