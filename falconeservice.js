
var tokenExist = false;
var token = null;
var vehicleList = [];
var hashes = {
    vehicle:{},
    planet:{}
};
var planetList = [];
var requestCompleted = 0;

var endpoints = {
    path: "https://findfalcone.herokuapp.com",
    planet: "planets",
    vehicle: "vehicles",
    token: "token",
    find: "find"
}

var pubsub = {
    subscriptions:{},
    publish:function(subscription,data){
        this.subscriptions[subscription] && this.subscriptions[subscription].forEach(subscriber=>{
            subscriber(data);
        }) 
    },
    subscribe:function(subscription,handler){
        this.subscriptions[subscription] = this.subscriptions[subscription] || [];
        let subscriptionId =  this.subscriptions[subscription].push(handler) -1 ;

        console.log(`Successfuly subscribed, ${subscription} subscription`);
        
        return {
            subscriptionType: subscription,
            subscriptionId: subscriptionId
        }  
    },
    unsubscribe:function({subscriptionType,subscriptionId}){
        if(subscriptionType && subscriptionId)
        {
          this.subscriptions[subscriptionType] && this.subscriptions[subscriptionType].splice(subscriptionId-1,1);
          console.warn(`You have unsubscribed the subscription, ${subscriptionType}`);   
        }else{
            console.error('Invalid subscription');
        }
    }
}
/**
 * 
 * @param {*} endpointId 
 * @param {*} method 
 * @param {*} queryParam 
 * @param {*} handler 
 */
function _reterive(endpointId,method="GET",queryParam={},handler) {
    function handleSuccess(data)
    {
        if(handler)
        {
            handler(data);
        }else{
            console.log(data);
        }
    }

    function handleError(error)
    {
        handler(error.responseJSON);
        console.error(error);
    }

    function GET(url,queryData)
    {
        $.ajax({
            url:url,
            dataType:"json",
            success:handleSuccess,
            error:handleError,
        })
    }

    function POST(url,queryData)
    {
        $.ajax(url,{
            type:"POST",
            dataType:"json",
            headers:{"Accept":"application/json"},
            contentType:"application/json",
            success:handleSuccess,
            error:handleError,
            data:JSON.stringify(queryData)
        })
    }


    let _url = `${endpoints.path}/${endpoints[endpointId]}`;
    switch(method)
    {
        case "GET":
            GET(_url,queryParam);
            break;
        case "POST":
            POST(_url,queryParam);
            break;
        default:
            console.error(`Requested method, ${method}, is not valid or available as of now.`);
    }
}

function _generateToken() {
    this._reterive("token","POST",{},(data)=>{
        /**
         * data will be in JS object
         */
        token = data.token;
        tokenExist = true;
        pubsub.publish('tokenGenerated',token);
    });
}
/**
 * 
 * @param {*} name 
 * @param {*} distance 
 */
var Planet = function (name, distance) {
    this.name = name;
    this.distance = distance;
}
/**
 * 
 * @param {*} name 
 * @param {*} availability 
 * @param {*} caliber 
 * @param {*} speed 
 */
var Vehicle = function (name, availability, caliber, speed) {
    this.name = name;
    this.availability = availability;
    this.caliber = caliber;
    this.speed = speed;
}

/**
 * Utility functions
 */

function getVehicles(doRequest = false) {
    if (!tokenExist) {
        _generateToken();
    }

    /**
     * Here we will utilise the vehicle api to fetch the values
     */
    // if (doRequest) {
    //     _reterive("vehicle","GET",{},(data)=>{
    //         this.vehicleList = data.map(({name,total_no:availability,max_distance:caliber,speed})=>new Vehicle(name,availability,caliber,speed));
    //         pubsub.publish('vehiclesDataAvailable',this.vehicleList);
    
    //         this.hashes.vehicle = this.vehicleList.reduce((res,{name, availability, caliber, speed})=>{
    //             res[name] = {availability:availability,caliber:caliber,speed:speed};
    //             return res;
    //         },{});
    //     });
    // }

    return vehicleList;
}


function getPlanets(doRequest = false) {
    if (!tokenExist) {
        _generateToken();
    }

    /**
     * Here we will utilise the planet api to fetch the values
     */
    // if (doRequest) {
    //     _reterive("planet","GET",{},(data)=>{
    //         this.planetList = data.map(({name,distance})=>new Planet(name,distance));
    //         pubsub.publish('planetsDataAvailable',this.planetList);
                    
    //         this.hashes.planet = this.planetList.reduce((res,{name, distance})=>{
    //             res[name] = distance;
    //             return res;
    //         },{});
    //     })
    // }

    return planetList;
}

function computeTime(destination,vehicle,strict=false)
{
    var {caliber,speed} = hashes.vehicle[vehicle];
    var destinationDistance = hashes.planet[destination];

    let timeTaken = destinationDistance/ speed;

    if(strict && caliber < destinationDistance)
    {
        console.warn(`Destination, ${destination} is too far for vehicle, ${vehicle}. Its caliber is ${caliber}`);
        timeTaken = -1;
    }

    return timeTaken;
}

function findQueen(destVechPair)
{
    let _postData = {
        token: token,
        planet_names:Object.keys(destVechPair),
        vehicle_names:Object.values(destVechPair)
    }

    _reterive(endpoints.find,'POST',_postData,(res)=>{
        var {planet_name,status,error} = res;
        if(!error)
        {
            pubsub.publish('findResult',{foundOn:planet_name,status:status==="success"||false});
        }else if(error.indexOf("Token not initialized")>-1){
            _generateToken();
            let subscription = pubsub.subscribe('tokenGenerated',()=>{
                pubsub.unsubscribe(subscription);
                findQueen(destVechPair);
            });
        }
    })
}

function _falconeInit()
{
    this._generateToken();

    this._reterive("vehicle","GET",{},(data)=>{
        this.vehicleList = data.map(({name,total_no:availability,max_distance:caliber,speed})=>new Vehicle(name,availability,caliber,speed));
        pubsub.publish('vehiclesDataAvailable',this.vehicleList);

        this.hashes.vehicle = this.vehicleList.reduce((res,{name, availability, caliber, speed})=>{
            res[name] = {availability:availability,caliber:caliber,speed:speed};
            return res;
        },{});
    });


    this._reterive("planet","GET",{},(data)=>{
        this.planetList = data.map(({name,distance})=>new Planet(name,distance));
        pubsub.publish('planetsDataAvailable',this.planetList);
                
        this.hashes.planet = this.planetList.reduce((res,{name, distance})=>{
            res[name] = distance;
            return res;
        },{});
    })

    this.pubsub.subscribe('updateVehicle',({name:vehicleId,decr})=>{
        let vehicle = this.vehicleList.filter(({name})=>name == vehicleId);
        vehicle = vehicle && vehicle[0];
        
        if(decr===true){
            vehicle.availability--;
        }else if(decr === false){
            vehicle.availability++;
        }
    });
}

var falconeService = function(){
    _falconeInit();
    this.getPlanets = getPlanets;
    this.getVehicles = getVehicles;
    this.find = findQueen;
    this.computeTime = computeTime;
    this.subscription = pubsub;
}