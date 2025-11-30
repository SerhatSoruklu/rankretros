const express = require('express');
const hotelController = require('../controllers/hotel.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, hotelController.createHotel);
router.get('/', hotelController.listHotels);
router.get('/:id', hotelController.getHotelById);
router.put('/:id', auth, hotelController.updateHotel);
router.delete('/:id', auth, hotelController.deleteHotel);

module.exports = router;
