const User = require('./user')
const Sector = require("./sector")
const Favorite = require("./favorite")

const run = async () => {
     // fetchUser()
     // createUser()
         // createSector()
    // fetchSectorWithCreator()
  listFavorites()
}

const fetchUser = async () => {
   let user = await User.findOne({ 
     where : {uid: 'asdf'}, 
     include: [
       { model: Sector, as: 'saves', required: true },
       { model: Sector, as: 'sector' }
     ]
   })
   if (!user) {
     console.log("not found..")
   } else {
     console.log(user.getData())
   }
}


const createUser = async () => {let user = await User.createOne({ uid: 'asdf', username: 'mm', email: 'shit@gmail.com'})
  if (user.error) {
    console.log(user.error)
  } else {
    console.log("User created..")
  }
}

const createSector = async () => {
  let date = new Date(1586466844381)
  await Sector.createOne({ name: '🎁 Shinpai Da Yo', creatorUid: 'asdf', daysAlive: 22, createdAt: date, updatedAt: date })
}

const createFavorite = async () => {
  await Favorite.createOne({ userUid: 'cgXowBCVSUd68IGkS4p0509oMcn2', sectorUid: '1vRlt4ET4241u' })
}

const fetchSectorWithCreator = async () => {
  let sector = await Sector.findOne({ 
    where: { name: 'Dark Eternal' },
    include: { model: User, as: 'creator' }
  })
  console.log("sector uid: " + sector.uid + " creator name: " + sector.creator.username)

}

const listFavorites = async () => {
  let user = await User.findOne({ 
    where: { uid: 'cgXowBCVSUd68IGkS4p0509oMcn2' },
    include: { model: Sector, as: 'favorites', through: Favorite }
  })
  console.log("user uid: " + user.uid)
  console.log(user.getData())

}

run()
