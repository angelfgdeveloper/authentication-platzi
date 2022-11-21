// Para vereificar si un objeto es vacio o no
const isEmptyObject = obj =>
  Object.keys(obj).length === 0 && obj.constructor === Object;

export default isEmptyObject;
