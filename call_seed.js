fetch('https://asia-southeast1-oceanpearl-ops.cloudfunctions.net/seedRealisticData')
    .then(res => res.json())
    .then(data => console.log(JSON.stringify(data, null, 2)))
    .catch(err => console.error(err));
