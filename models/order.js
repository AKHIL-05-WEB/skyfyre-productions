const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: Object,
    required: true
  },
  quantity: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    default: 'Pending'
  },
  orderedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);
