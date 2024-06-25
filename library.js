let slot1;
let slot2;
let slot13;
let slot14;
let tabURL;
let workMonth;
let workYear;
const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;
let factorialURL = "https://api.factorialhr.com";

const setUrl = async (tab) => {

  const checked = slot13.checked;
  
  if (checked && slot14) {
  const convertedMonth = parseInt(slot14.split('-')[1]);
  const convertedYear = parseInt(slot14.split('-')[0]);
  tab = tab || await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  tabURL = "https://app.factorialhr.com/attendance/clock-in/" + convertedYear + "/" + convertedMonth;
  } else {
  tab = tab || await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  tabURL = "https://app.factorialhr.com/attendance/clock-in/" + currentYear + "/" + currentMonth;
  }
};

const getSlots = (mode) => {
  if (mode === 1) {
    let base = tabURL.split("?")[1].split("&");
    slot1 = base[1]?.split("=")[1];
    slot2 = base[2]?.split("=")[1];
    slot13 = base[13];
    slot14 = base[14]?.split("=")[1];
  } else {
    slot1 = document.getElementById("input1")?.value;
    slot2 = document.getElementById("input2")?.value;
    slot13 = document.getElementById("input13");
    slot14 = document.getElementById("input14")?.value;
  }
};


const setMonth = () => {
  workMonth = tabURL.split("clock-in/")[1].split("/")[1];
};

const setYear = () => {
  workYear = tabURL.split("clock-in/")[1].split("/")[0];
};

const getData = async (mode, tab) => {
  getSlots(mode);
  await setUrl();
  setMonth();
  setYear();
};

const getAccessId = async () => {
  try {
    const response = await fetch(factorialURL + "/accesses", {
      method: "GET",
    });

    if (response.ok) {
      const jsonResponse = await response.json();


      for (let index = 0; index < jsonResponse.length; index++) {
        if (jsonResponse[index].current) {
          return jsonResponse[index].id;
        }
      }

      throw "Unable to find access id.";
    }
  } catch (error) {
    throw "Unable to find access id";
  }
};

const getEmployeeId = async (accessId) => {
  try {
    const response = await fetch(factorialURL + "/employees", {
      method: "GET",
    });

    if (response.ok) {
      const jsonResponse = await response.json();

      for (let index = 0; index < jsonResponse.length; index++) {
        if (jsonResponse[index].access_id === accessId) {
          return jsonResponse[index].id;
        }
      }

      throw "Unable to find user.";
    }
  } catch (error) {
    throw "Unable to find user";
  }
};

const getPeriodId = async (employeeId) => {
  try {
    const response = await fetch(
      factorialURL +
        "/attendance/periods?year=" +
        workYear +
        "&month=" +
        workMonth +
        "&employee_id=" +
        employeeId,
      {
        method: "GET",
      }
    );

    if (response.ok) {
      const jsonResponse = await response.json();
      return jsonResponse[0].id;
    }
  } catch (error) {
    throw error;
  }
};

const getDaysToFill = async (employeeId) => {
  try {
    const response = await fetch(
      factorialURL +
        "/attendance/calendar?id=" +
        employeeId +
        "&year=" +
        workYear +
        "&month=" +
        workMonth,
      {
        method: "GET",
      }
    );

    if (response.ok) {
      let arrayDates = [];
      const jsonResponse = await response.json();
      console.log(jsonResponse)
      jsonResponse.forEach((element) => {
        if (
          element.is_laborable &&
          !element.is_leave &&
          new Date(element.date) <= new Date()
        ) {
          arrayDates.push(element.day);
        }
      });
      return arrayDates;
    }
  } catch (error) {
    throw error;
  }
};

const fillDays = async (periodId, days, employeeId) => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const nonFridayDays = days;
  try {
    if (slot1 && slot2) {
      nonFridayDays.forEach((dayToFill) => {
        fillDay(periodId, dayToFill, slot1, slot2);
      });
    }
  } catch (error) {
    throw error;
  }
};

const fillDay = async (periodId, dayToFill, clockIn, clockOut, workable = true) => {
  try {
    bodytosend=JSON.stringify({
      clock_in: clockIn,
      clock_out: clockOut,
      date: workYear+"-"+String(currentMonth).padStart(2, "0")+"-"+dayToFill,
      day: dayToFill,
      period_id: periodId,
      workable: workable
    });
    console.log(bodytosend);
    const response = await fetch(factorialURL + "/attendance/shifts", {
      body: bodytosend,
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json;charset=UTF-8",
      },
      method: "POST",
    });
  } catch (error) {
    throw error;
  }
};

const main = async (mode, tab) => {
  try {
    await getData(mode, tab);
    let access_id = await getAccessId();
    let employee_id = await getEmployeeId(access_id);
    let period_id = await getPeriodId(employee_id);
    let days_to_fill = await getDaysToFill(employee_id);
    console.log(days_to_fill);
    await fillDays(period_id, days_to_fill, employee_id);
    alert("Worked hours added correctly. Refreshing.");
    chrome.tabs.create({ url: "https://app.factorialhr.com/attendance/clock-in/"+workYear+"/"+workMonth });
  } catch (error) {
    alert("error: " + error);
  }
};



const launchScript = () => {
  main(0, null);
};

if (typeof document !== 'undefined') {
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("input14").value=currentYear+"-"+String(currentMonth).padStart(2, "0");
    document
      .getElementById("launchScript")
      .addEventListener("click", launchScript);
  });
}

