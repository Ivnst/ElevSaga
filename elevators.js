{
    init: function(elevators, floors) {

        highLoadFactor = 0.70;

        getUpperBusyFloor = function() {
            for(var i = floors.length - 1; i > 0; i--)
                if(floors[i].isWaiting())
                    return i;
            return null;
        }

        getFreeElevator = function() {
            for(var i = 0; i < elevators.length - 1; i++)
                if(elevators[i].direct == "")
                    return i;
            return null;
        }
        
        pushFreeElevator = function(floor){
            var freeElevatorId = getFreeElevator();
            if(freeElevatorId != null)
                elevators[freeElevatorId].go();
        }

        elevators.forEach(function(e) {    
            e.direct = "";

            e.log = function(msg, floorNum) {
                return;
                console.log(msg + ": e=" + elevators.indexOf(e) 
                            + ", q=" + e.destinationQueue 
                            + ", d=" + e.direct
                            + ", lf=" + e.loadFactor()
                            + ", pf=" + e.getPressedFloors()
                            + ", f=" + floorNum);
            }
            
            e.goUp = function() {
                var maxFloorId = floors.length - 1;
                e.log("goUp", e, maxFloorId)

                if (e.isDestination(0))
                {
                    e.log("goUp-clearQueue", e, 0)
                    e.destinationQueue.length = 0;
                    e.checkDestinationQueue();
                }

                if (!e.isDestination(maxFloorId))
                {
                    e.setDirection("up");
                    e.goToFloor(maxFloorId);
                }
            }

            e.goDown = function(){
                var maxFloorId = floors.length - 1;
                e.log("goDown", e, 0)

                if (e.isDestination(maxFloorId))
                {
                    e.log("goDown-clearQueue", e, maxFloorId)
                    e.destinationQueue.length = 0;
                    e.checkDestinationQueue();
                }

                if (!e.isDestination(0))
                {
                    e.setDirection("down");
                    e.goToFloor(0);
                }
            }

            e.setDirection = function(dir){
                e.log("setDirection-"+dir, e, 0)
                if(dir == "up")
                {
                    e.goingDownIndicator(false);
                    e.goingUpIndicator(true);
                    e.direct = "up";
                }
                else if(dir == "down")
                {
                    e.goingDownIndicator(true);
                    e.goingUpIndicator(false);
                    e.direct = "down"; 
                }
                else
                {                    
                    e.goingDownIndicator(true);
                    e.goingUpIndicator(true);
                    e.direct = "";
                }
            }

            e.go = function(){
                e.log("go", e, -1)
                var currFloor = e.currentFloor();
                var maxFloorId = floors.length - 1;
                var upperWaitingFloorId = getUpperBusyFloor();
                var hasDestinations = e.getPressedFloors().length > 0;

                if(e.direct == "")
                {
                    if(currFloor == 0)
                    {
                        e.log("go-emptyDirect-currFloor=0-goUp", e, -1)
                        e.goUp();
                    }
                    else if(currFloor == maxFloorId)
                    {
                        e.log("go-emptyDirect-currFloor=max-goDown", e, -1)
                        e.goDown();
                    }
                    else
                    {
                        e.log("go-emptyDirect-else-goDown", e, -1)
                        e.goDown();
                    }
                }
                else if(e.direct == "up")
                {
                    if(currFloor == maxFloorId || (upperWaitingFloorId <= currFloor && !hasDestinations))
                    {
                        e.log("go-directUp-currFloor=max-goDown", e, -1)
                        e.goDown();
                    }
                    else
                    {
                        e.log("go-directUp-currFloorElse-goUp", e, -1)
                        e.goUp();
                    }
                }
                else if(e.direct == "down")
                {
                    if(currFloor == 0)
                    {
                        e.log("go-directDown-currFloor=0-goUp", e, -1)
                        e.goUp();
                    }
                    else 
                    {
                        e.log("go-directDown-currFloorElse-goDown", e, -1)
                        e.goDown();
                    }
                }
            }

            e.isDestination = function(floorNum) {
                return e.destinationQueue.indexOf(floorNum) != -1;
            }

            e.on("floor_button_pressed", function(floorNum) {
                e.log("floor_button_pressed", e, floorNum);
                e.go();
            });

            e.on("idle", function() {
                e.log("idle", e, -1)
                e.setDirection("");

                if(e.currentFloor() == 0 && floors[0].isWaiting())
                {
                    e.log("idle-currentFloor=0", e, 0)
                    e.goToFloor(0, true);
                    return;
                }

                //e.go();
            });

            e.on("passing_floor", function(floorNum, direction) {
                e.log("passing_floor", e, floorNum)

                var isInQueue = e.isDestination(floorNum);
                if(isInQueue) return;

                var upperWaitingFloorId = getUpperBusyFloor();

                var isDestination = e.getPressedFloors().indexOf(floorNum) != -1;
                var isWaitingInTheSameDirection = (e.direct == "up" ? floors[floorNum].isWaitingUp() : floors[floorNum].isWaitingDown());
                var currFloorIsMaxWaiting = upperWaitingFloorId <= floorNum;
                var hasDestinations = e.getPressedFloors().length > 0;

                if (isDestination || (isWaitingInTheSameDirection && e.loadFactor() < highLoadFactor)) {
                    e.goToFloor(floorNum, true);
                }

                if(currFloorIsMaxWaiting && !hasDestinations && floors[floorNum].isWaiting())
                {
                    e.goToFloor(floorNum, true);
                }

                if(currFloorIsMaxWaiting && !hasDestinations)
                {
                    e.go();
                }
            });

            e.on("stopped_at_floor", function(floorNum) {
                e.log("stopped_at_floor", e, floorNum)

                if(e.destinationQueue.length == 0 || e.getPressedFloors().length == 0)
                    e.go();
            });            

        });

        floors.forEach(function(f) {

            f.isWaitingUp   = function() { return f.buttonStates.up   == "activated"; }
            f.isWaitingDown = function() { return f.buttonStates.down == "activated"; }
            f.isWaiting     = function() { return f.isWaitingUp() || f.isWaitingDown(); }
            f.getWaitingDir = function() { return f.isWaitingUp() ? "up" : (f.isWaitingDown() ? "down" : ""); }
            f.log           = function(msg) { return; console.log(msg + ": f=" + f.floorNum()); }
            
            f.on("up_button_pressed", function() {
                f.log("up_button_pressed", f);
                pushFreeElevator(f);
            });
            f.on("down_button_pressed", function() {
                f.log("down_button_pressed", f);
                pushFreeElevator(f);
            });        
        });
    },
    update: function(dt, elevators, floors) { }
}