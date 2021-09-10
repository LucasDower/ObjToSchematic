let val = 2147483649;

function fa(val) {
  if (val > 2147483647) {
    return -(-val & 0xFFFFFFFF);
  }
  return val;
}

function fb(val) {
  if (val > 2147483647) {
    return val - 4294967296;
  }
  return val;
}


console.log(fa(val), fb(val));