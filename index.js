import fs from 'fs'
    var bite_size=256,
        readbytes = 0,
        file,
        loggedChar = ''
    import ioClient from 'socket.io-client'
    import * as dotenv from 'dotenv'

const main = (socket, roomId, pwd, filePath, playersToTrack) => {
    try {
        socket.on('error', msg => {
            console.error(msg)
        })
    
        fs.watchFile(filePath, (curr, prev) => {
            //console.log('change')
        })
        
        //console.log(fs.existsSync(filePath))
        
        fs.open(filePath, 'r', (err,fd) => { file = fd; readsome();})
        let autopsiedMobs = new Set(); 
        function readsome() {
            var stats = fs.fstatSync(file)
            if(stats.size < readbytes + 1 ) {
                setTimeout(readsome, 1000)
            } else {
                fs.read(file, new Buffer(bite_size), 0 , bite_size , readbytes, processSome)
            }
        }
        var lastLineFeed,
            lineArray;
        
        let toLog = false;
        ['DaddyWick', 'Lyramis', 'Remath', 'Remechanics', 'Ranperre', 'ProfessorCat', 'Thunderbird', 'Celerity', 'Lice', 'Deldaron', 'McBreezy', 'Vetala', 'Razzly', 'Folidar', 'The25thBaam']
        
        let dataToSend = []
        let id = 0
        function processSome(err, bytecount, buff) {
            lastLineFeed = buff.toString('utf-8', 0, bytecount).lastIndexOf('\n');
        
            if(lastLineFeed > -1){
        
                // Split the buffer by line
                lineArray = buff.toString('utf-8', 0, bytecount).slice(0,lastLineFeed).split('\n');
            
                // Then split each line by comma
                let autopsyScreen = new RegExp('[[]\\d+:\\d+] LocalPlayer: ProcessTalkScreen[(]\\d+, Search\.+','g');
                let dps = new RegExp(`(${playersToTrack}): \.+`,'g')
                let autopsyEnd = new RegExp('[,] [,] System[.]Int32[[]], System[.]String[[]], (0|1), Corpse[)]')
        
                for(let i=0;i<lineArray.length;i++){

                    if (autopsyScreen.test(lineArray[i])) {
                        if (lineArray[i].trim().endsWith(')')) {
                            continue
                        } 
                        id = lineArray[i].substring(39,46)
                        toLog = !autopsiedMobs.has(id)
                        if (toLog) autopsiedMobs.add(id)
                    } else if (dps.test(lineArray[i])) {
                        if (toLog) {
                            dataToSend.push(lineArray[i])
                        }      
                    } else if (autopsyEnd.test(lineArray[i]) && toLog) {
                        socket.emit('local', {dataToSend, roomId, pwd})
                        dataToSend = []
                    }
                    autopsyEnd.lastIndex = -1
                    dps.lastIndex = -1
                    autopsyScreen.lastIndex = -1
                }   
        
                // Set a new position to read from
                readbytes+=lastLineFeed+1;
            } else {
                // No complete lines were read
                readbytes+=bytecount;
            }
            process.nextTick(readsome);
        }
        
    } catch(errr) {
        fs.writeFile('./error.log', String(errr), { "flag": "w"}, err => {
            console.log(err)
        })
    }    
    
}

const createRoomF = (socket, pwd, playerList) => {
    socket.emit('createRoom', ({pwd, playerList}))
}

try {
    dotenv.config()
    /********************
     IMPORTANT 
     */
    const filePath = process.env.FILEPATH
    const roomId = process.env.ROOM_ID 
    const pwd = process.env.PWD
    let playersToTrack = process.env.PLAYERS_TO_TRACK
    let dev = process.env.DEV ?? false
    let createRoom = process.env.CREATE_ROOM ?? false
    const connString = dev == 'true' ? 'http://localhost:5173' : 'http://93.177.65.78:5173'
    /******** */
    console.log(`
     _   _  _________________   _____ _____  _____    _______ _   _ _   _  _   ___   __
    | \\ | ||  ___| ___ \\  ___| |_   _/  __ \\|  ___|  / / ___ \\ | | | \\ | || \\ | \\ \\ / /
    |  \\| || |__ | |_/ / |_      | | | /  \\/| |__   / /| |_/ / | | |  \\| ||  \\| |\\ V / 
    | . \` ||  __||    /|  _|     | | | |    |  __| / / | ___ \\ | | | . \` || . \` | \\ /  
    | |\\  || |___| |\\ \\| |      _| |_| \\__/\\| |___/ /  | |_/ / |_| | |\\  || |\\  | | |  
    \\_| \\_/\\____/\\_| \\_\\_|      \\___/ \\____/\\____/_/   \\____/ \\___/\\_| \\_/\\_| \\_/ \\_/  
                                                                                       `)
    const socket = ioClient(connString)
    socket.on('success', id => {
        console.log(`OBS URL: ${connString}/TrackObs?Id=${id}&Pwd=${pwd}`)
        console.log(`Browser URL: ${connString}/Track?Id=${id}&Pwd=${pwd}\n\n\n`)
        main(socket, id, pwd, filePath, playersToTrack)
    })
    socket.on('error', msg => {
        fs.writeFile('./error.log', msg, { "flag": "w"}, err => {
            console.log(err)
        })
    })

    if (createRoom == 'true') {
        createRoomF(socket, pwd, playersToTrack)
    }
    else 
        main(socket, roomId, pwd, filePath, playersToTrack)

   
} catch(err) {
    fs.writeFile('./error.log', String(err), { "flag": "w"}, er => {
        console.log(er)
    })
}   