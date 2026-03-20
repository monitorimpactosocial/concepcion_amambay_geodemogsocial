const fs = require('fs');
const filepath = 'G:/Mi unidad/geodatos/geoportaline/uso_de_suelo_concepcion.geojson';
console.log('Size:', fs.statSync(filepath).size / (1024 * 1024), 'MB');
const rs = fs.createReadStream(filepath, {encoding: 'utf8', highWaterMark: 1024 * 1024});
let data = '';
rs.on('data', chunk => {
  data += chunk;
  const match = data.match(/"properties"\s*:\s*(\{.*?\})/);
  if (match) {
    console.log('Props:', match[1]);
    process.exit(0);
  }
});
