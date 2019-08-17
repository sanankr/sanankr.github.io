var falcService;

var selectedDestinations;
var selectedVehicles;
var totalTime;

/**
 * container fields
 */

var searchCntnr;
var resultCntnr;
var resetBtn;

/**
 * search field part
 */
var destinations;
var vehicleDivs;
var journeyTime;
var findFalconeBtn;

/**
 * result field part
 */
var resultTitle;
var resultRepo;
var resultTime;
var resultPlanet;
var startAgainBtn;

function initDefaultState(){
    selectedDestinations = [];
    selectedVehicles = {};
    totalTime = 0;
}
function initDestination(destination, data) {
    function generateOption(value, text) {
        var option = document.createElement("Option");
        option.nodeValue = value;
        option.innerText = text;

        return option;
    }

    if (destination.childElementCount == 1) {
        var planetList = data || falcService.getPlanets();
        planetList = planetList.map(planet => planet.name);
        planetList.forEach(planet => {
            destination.append(generateOption(planet, planet));
        })
    }
}

function initVehicles(vehicleDiv, id, destination) {
    function generateRadio(id, value, disable = false) {
        var radio = document.createElement("Input");

        radio.type = "radio";
        radio.name = id;
        radio.value = value;
        radio.disabled = disable;

        return { field: radio, label: document.createElement('Br') };
    }

    while (vehicleDiv.firstChild && vehicleDiv.removeChild(vehicleDiv.firstChild));

    var vehicles = falcService.getVehicles();
    var [{ distance: destDist }] = falcService.getPlanets().filter(({ name }) => name === destination);
    vehicles.forEach(({ name, availability, caliber, speed }) => {
        var { field, label } = generateRadio(id, name, availability == 0 || destDist > caliber);
        vehicleDiv.append(field);

        vehicleDiv.append(name);
        vehicleDiv.append(` (${availability})`)

        vehicleDiv.append(label);
    });
}

function calculateTime(destination, vehicle) {
    let timeTaken = falcService.computeTime(destination, vehicle);
    if (totalTime < timeTaken) {
        totalTime = timeTaken;
        journeyTime.innerText = totalTime;
    }
}

function handleSelectedDestination({ target: option }, nextDestination, vehicleDiv, id) {
    selectedDestinations[id] = option.value;

    let vehicleOpted = selectedVehicles[`div-${id}-vehicle`];
    delete selectedVehicles[`div-${id}-vehicle`];
    vehicleOpted && falcService.subscription.publish('updateVehicle', { name: vehicleOpted, decr: false });

    initVehicles(vehicleDiv, `div-${id}-vehicle`, option.value);
    if (nextDestination !== null) {
        let data = falcService.getPlanets().filter(({ name: planet }) => selectedDestinations.indexOf(planet) == -1);
        initDestination(nextDestination, data);
    }
}

function handleRadioClick({ target: radio }, divId, id) {
    let vehicleOpted = selectedVehicles[divId];
    let vehicleOpting = radio.value;

    this.calculateTime(selectedDestinations[id], vehicleOpting);

    if (vehicleOpted !== vehicleOpting) {
        selectedVehicles[divId] = vehicleOpting;
    }

    vehicleOpted && falcService.subscription.publish('updateVehicle', { name: vehicleOpted, decr: false });
    vehicleOpting && falcService.subscription.publish('updateVehicle', { name: vehicleOpting, decr: true });

    if(Object.keys(selectedVehicles).length == vehicleDivs.length){
        /**
         * activate the find button
         */
        findFalconeBtn.classList.add("btn-active");
    }
}

function handleBtnClick({target:{name}}) {    
    if(name === startAgainBtn.name || name === resetBtn.name){
        /**
         * reset the environment
         */
        
        vehicleDivs.forEach(vehicleDiv=>{
            while(vehicleDiv.firstChild && vehicleDiv.removeChild(vehicleDiv.firstChild));
        });

        destinations.forEach(destinationDiv=>{
            let childCount = destinationDiv.childElementCount;
            while(childCount-- >1 && destinationDiv.removeChild(destinationDiv.lastChild));
        });

        Object.values(selectedVehicles).forEach(vehicle=>{
            falcService.subscription.publish('updateVehicle', { name: vehicle, decr: false });
        });

        initDefaultState();
        initDestination(destinations[0]);
        journeyTime.innerText = totalTime;

        findFalconeBtn.classList.remove("btn-active");
        resultCntnr.classList.add("fal-hidden");
        searchCntnr.classList.remove("fal-hidden");

    }
    else if (selectedDestinations.length == 4) {
        let index = 0,
            vehicles = Object.values(selectedVehicles);
        let destVechPair = selectedDestinations.reduce((res, curr) => {
            res[curr] = vehicles[index++];
            return res;
        }, {});

        falcService.find(destVechPair);
    }
}

function setResult(success, planet) {
    let _title = document.createElement("p");
    let repoHiddenClass = "fal-hidden";

    resultRepo.classList.add(repoHiddenClass);

    if (success) {
        _title.innerText = 'Success! Congratulations on finding Falcone. King Shan is mighty pleased.'

        let _repoTime = document.createElement("h4");
        let _repoPlanet = document.createElement("h4");

        _repoTime.innerText = `Time taken: ${totalTime}`;
        _repoPlanet.innerText = `Planet found: ${planet}`;

        resultTime.firstChild != null ? resultTime.replaceChild(_repoTime, resultTime.firstChild) : resultTime.append(_repoTime);
        resultPlanet.firstChild != null ? resultPlanet.replaceChild(_repoPlanet, resultPlanet.firstChild) : resultPlanet.append(_repoPlanet);

        resultRepo.classList.remove(repoHiddenClass);
    } else {
        _title.innerText = 'Failed to find Falcone.';
    }

    resultTitle.firstChild != null ? resultTitle.replaceChild(_title, resultTitle.firstChild) : resultTitle.append(_title);
}

function init() {
    initDefaultState();
    falcService = new falconeService();
        
    searchCntnr = document.getElementsByClassName("fal-cntnr")[0];
    resultCntnr = document.getElementsByClassName("fal-result")[0];
    resetBtn = document.getElementsByName("reset")[0]; 

    destinations = document.getElementsByName("fal-option");
    vehicleDivs = document.getElementsByName("fal-radio");
    journeyTime = document.getElementsByClassName("fal-cntnr-time")[0].lastElementChild;
    findFalconeBtn = document.getElementsByName("findFalcone")[0];


    resultTitle = document.getElementsByClassName("fal-message-title")[0];
    resultRepo = document.getElementsByClassName("fal-result-report")[0];
    resultTime = document.getElementsByClassName("fal-repo-time")[0];
    resultPlanet = document.getElementsByClassName("fal-repo-planet")[0];
    startAgainBtn = document.getElementsByName("startAgain")[0];

    falcService.subscription.subscribe('planetsDataAvailable', (planets) => {
        destinations.forEach((destination, index) => {
            destination.onchange = (e) => { this.handleSelectedDestination(e, destinations[index + 1] || null, vehicleDivs[index], index) };
            if (index == 0) {
                this.initDestination(destination, planets);
            }
        });
    });

    falcService.subscription.subscribe('vehiclesDataAvailable', () => {
        vehicleDivs.forEach((div, index) => {
            div.onclick = (e) => { this.handleRadioClick(e, `div-${index}-vehicle`, index) };
        })
    });

    falcService.subscription.subscribe('findResult', ({ foundOn: planet, status: found }) => {
        if (found) {
            this.setResult(true, planet);
        } else {
            this.setResult(false);
        }
        resultCntnr.classList.remove("fal-hidden");
        searchCntnr.classList.add("fal-hidden");
    });

    findFalconeBtn.onclick = this.handleBtnClick;
    startAgainBtn.onclick = this.handleBtnClick;
    resetBtn.onclick = this.handleBtnClick;
}
