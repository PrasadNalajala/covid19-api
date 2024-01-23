const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const dataPath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;
const initializeDb = async () => {
  db = await open({
    filename: dataPath,
    driver: sqlite3.Database,
  });
  app.listen(3000, () => console.log("Server started"));
};

initializeDb();

app.use(express.json());

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const verifyUserQuery = `
        SELECT *
        FROM
        user
        WHERE
        username='${username}'
        `;
  const userDetails = await db.get(verifyUserQuery);
  if (userDetails !== undefined) {
    const isUserRegistered = bcrypt.compare(password, userDetails.password, 10);
    if (!isUserRegistered) {
      response.status(400);
      response.send("Invalid user");
    } else {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "secure");
      const data = { jwtToken: jwtToken };
      response.send(data);
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

app.get("/states/", async (request, response) => {
  const query =
    "SELECT state_id as stateId,state_name as stateName,population FROM state";
  const data = await db.all(query);
  response.send(data);
});

app.get("/states/:stateId", async (request, response) => {
  const { stateId } = request.params;
  const query = `SELECT state_id as stateId,state_name as stateName,population 
  FROM state
  WHERE state_id=${stateId}`;
  const data = await db.get(query);
  response.send(data);
});

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const query = `
    INSERT INTO district (district_name,state_id,cases,cured,active,deaths)
    VALUES(
        '${districtName}',
        '${stateId}',
        '${cases}',
        '${cured}',
        '${active}',
        '${deaths}'
    )`;
  await db.run(query);
  response.send("District successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const query = `
    SELECT
    district_id as districtId,
    district_name as districtName,
    state_id as stateId,
    cases,
    cured,
    active,
    deaths
    FROM
    district
    WHERE
    district_id='${districtId}'
    `;
  const data = await db.get(query);
  response.send(data);
});

app.delete("/districts/:districtId", async (request, response) => {
  const { districtId } = request.params;
  const query = `
    DELETE
    FROM
    district
    WHERE
    district_id='${districtId}'`;
  await db.run(query);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const query = `
    UPDATE
    district
    SET 
    district_name='${districtName}',
    state_id='${stateId}',
    cases='${cases}',
    cured='${cured}',
    active='${active}',

    deaths='${deaths}'

    `;
  await db.run(query);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const query = `
    SELECT
    SUM(district.cases) as totalCases,
    SUM(district.cured) as totalCured,
    SUM(district.active) as totalActive,
    SUM(district.deaths) as totalDeaths
    FROM
    district
    INNER JOIN state ON state.state_id=district.state_id
    WHERE
    district.state_id=${stateId}
    `;

  const data = await db.get(query);
  response.send(data);
});

module.exports = app;
