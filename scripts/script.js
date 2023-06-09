function startTime() {
  var today = new Date(Date.now()).toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
  document.getElementById("currDateTime").innerHTML = today;
  var t = setTimeout(startTime, 500);
}

function calcInvPower() {
    var inverterPower = document.getElementById("inverterOption").value;
    var numberOfPieces = document.getElementById("inverterOptionPcs").value;
    var totalPower = inverterPower * numberOfPieces;
    document.getElementById("calculatedInvPower").value = totalPower;
}
function calcSolarPower() {
    var solarPower = document.getElementById("panelOption").value;
    var numberOfPieces = document.getElementById("panelOptionPcs").value;
    var totalPower = solarPower * numberOfPieces;
    document.getElementById("calculatedSolarPower").value = totalPower;
}
function calcBattEnergy() {
    var battEnergy = document.getElementById("batteryOption").value;
    var numberOfPieces = document.getElementById("batteryOptionPcs").value;
    var totalEnergy = battEnergy * numberOfPieces;
    document.getElementById("calculatedBattEnergy").value = totalEnergy;
}

