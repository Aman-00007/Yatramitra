const mongoose = require("./connections/db");
const { Airline, Airport, Flight } = require("./models/flightSearch");
const { Bus, City: BusCity, busComapny } = require("./models/busSearch");
const { Train, Station } = require("./models/trainSearch");

const indianCities = ["Bombay", "Delhi", "Calcutta", "Hyderabad", "Nagpur"];
const iataCodes = {
  Bombay: "BOM",
  Delhi: "DEL",
  Calcutta: "CCU",
  Hyderabad: "HYD",
  Nagpur: "NAG",
};

const airlinesToSeed = [
  { name: "DesiWings", iata_code: "DW" },
  { name: "BlueLoop Air", iata_code: "BL" },
  { name: "SpiceHorizon", iata_code: "SH" },
];

const busCompaniesToSeed = [
  { name: "Shiva Travels", iata_code: "SHV" },
  { name: "Royal Hoppers", iata_code: "RHP" },
];

const flightRoutes = [
  { origin: "Bombay", destination: "Delhi" },
  { origin: "Delhi", destination: "Bombay" },
  { origin: "Calcutta", destination: "Hyderabad" },
  { origin: "Hyderabad", destination: "Calcutta" },
  { origin: "Nagpur", destination: "Bombay" },
  { origin: "Bombay", destination: "Nagpur" },
];

const busRoutes = [
  { origin: "Bombay", destination: "Delhi" },
  { origin: "Delhi", destination: "Nagpur" },
  { origin: "Hyderabad", destination: "Calcutta" },
];

const trainRoutes = [
  {
    name: "Coastal Express",
    number: "11001",
    startHour: 6,
    stations: ["Bombay Central", "Nagpur Junction", "Hyderabad Deccan"],
  },
  {
    name: "Heritage Link",
    number: "22012",
    startHour: 7,
    stations: ["Delhi Sarai Rohilla", "Nagpur Junction", "Calcutta Station"],
  },
];

const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const formatTime = (date) => date.toTimeString().slice(0, 5);

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);

const buildDateSlots = () => {
  const base = new Date();
  return Array.from({ length: 3 }, (_, offset) => {
    const date = new Date(base);
    date.setDate(date.getDate() + offset);
    return {
      date: date.toISOString().split("T")[0],
      availableSeats: randomBetween(20, 45),
    };
  });
};

const createFlightTimes = () => {
  const departureHour = randomBetween(5, 20);
  const departureMinute = [0, 15, 30, 45][randomBetween(0, 3)];
  const durationMinutes = randomBetween(110, 130);
  const departure = new Date();
  departure.setHours(departureHour, departureMinute, 0, 0);
  const arrival = addMinutes(departure, durationMinutes);

  return {
    departureTime: formatTime(departure),
    arrivalTime: formatTime(arrival),
  };
};

const createBusTimes = () => {
  const departureHour = randomBetween(5, 22);
  const departureMinute = [0, 10, 20, 30, 40, 50][randomBetween(0, 5)];
  const durationMinutes = randomBetween(320, 480);
  const departure = new Date();
  departure.setHours(departureHour, departureMinute, 0, 0);
  const arrival = addMinutes(departure, durationMinutes);

  return {
    departure_time: formatTime(departure),
    arrival_time: formatTime(arrival),
  };
};

const buildTrainScheduleForDate = (route, baseDate, index) => {
  const scheduleDate = new Date(baseDate);
  scheduleDate.setDate(scheduleDate.getDate() + index);
  const startTime = new Date(scheduleDate);
  startTime.setHours(route.startHour, 0, 0, 0);

  let currentTime = new Date(startTime);
const stoppages = route.stations.map((station, stopIndex) => {
  const arrival = new Date(currentTime);
  const departure = new Date(currentTime);

  if (stopIndex < route.stations.length - 1) {
    departure.setMinutes(departure.getMinutes() + 10);
    currentTime = addMinutes(departure, randomBetween(90, 130));
  } else {
    departure.setMinutes(departure.getMinutes() + 5);
  }

  return {
    station,
    arrivalTime: arrival,
    departureTime: departure,
    price: 500 + stopIndex * 150,
  };
});

  return {
    date: new Date(scheduleDate),
    stoppages,
    availableSeats: randomBetween(70, 140),
  };
};

async function seedTransportData() {
  console.log("Clearing existing transport content...");
  await Promise.all([
    Flight.deleteMany(),
    Airline.deleteMany(),
    Airport.deleteMany(),
    Bus.deleteMany(),
    busComapny.deleteMany(),
    BusCity.deleteMany(),
    Train.deleteMany(),
    Station.deleteMany(),
  ]);

  console.log("Seeding airports and airlines...");
  const airportDocs = await Airport.insertMany(
    indianCities.map((city) => ({
      name: `${city} International Airport`,
      city,
      country: "India",
      iata_code: iataCodes[city],
    }))
  );

  const airlineDocs = await Airline.insertMany(airlinesToSeed);

  console.log("Seeding flights...");
  const flights = [];
  airlineDocs.forEach((airline, airlineIndex) => {
    const routesForThisAirline = flightRoutes.slice(airlineIndex * 2, airlineIndex * 2 + 2);
    routesForThisAirline.forEach((route) => {
      const { departureTime, arrivalTime } = createFlightTimes();
      const dates = buildDateSlots();
      flights.push({
        flight_number: `${airline.iata_code}${randomBetween(100, 999)}`,
        airline_id: airline._id,
        origin: iataCodes[route.origin],
        destination: iataCodes[route.destination],
        dates,
        departure_time: departureTime,
        arrival_time: arrivalTime,
        price: randomBetween(2500, 4200),
      });
    });
  });
  await Flight.insertMany(flights);

  console.log("Seeding bus cities and operators...");
  await BusCity.insertMany(
    indianCities.map((city) => ({ city, country: "India" }))
  );
  const busCompanies = await busComapny.insertMany(busCompaniesToSeed);

  console.log("Seeding buses...");
  const buses = busRoutes.map((route, index) => {
    const { departure_time, arrival_time } = createBusTimes();
    return {
      bus_number: `BUS${100 + index}`,
      busCompany_id: busCompanies[index % busCompanies.length]._id,
      origin: iataCodes[route.origin],
      destination: iataCodes[route.destination],
      dates: buildDateSlots(),
      departure_time,
      arrival_time,
      price: randomBetween(800, 1600),
    };
  });
  await Bus.insertMany(buses);

  console.log("Seeding stations and trains...");
  await Station.insertMany(
    indianCities.map((city) => ({
      name: `${city} Central`,
      city,
      country: "India",
      stationCode: iataCodes[city],
    }))
  );

  const trains = trainRoutes.map((route) => ({
    name: route.name,
    number: route.number,
    schedules: Array.from({ length: 3 }, (_, scheduleIndex) =>
      buildTrainScheduleForDate(route, new Date(), scheduleIndex)
    ),
  }));
  await Train.insertMany(trains);

  console.log("Seed completed. Disconnecting from database.");
  await mongoose.connection.close();
}

seedTransportData()
  .then(() => console.log("All transport seed data saved."))
  .catch((error) => {
    console.error("Seeding failed:", error);
    mongoose.connection.close();
    process.exit(1);
  });