import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { easeCubic } from 'd3-ease';
import * as turf from '@turf/turf';

import diamond from './diamond2.png';
import marker1 from './marker1.png';

import './app.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

const App = () => {
  let map;
  const mapContainer = useRef();

  const destinations = [[-122.414, 37.776], [-77.032, 38.913], [-79.347015, 43.651070]];

  // Used to increment the value of the point measurement against the route.
  let counter = 0;

  // Number of steps to use in the arc and animation, more steps means
  // a smoother arc and animation, but too many steps will result in a
  // low frame rate
  const steps = 500;

  // A simple line from origin to destination.
  const route = {
    'type': 'FeatureCollection',
    'features': [
      {
        'type': 'Feature',
        'geometry': {
          'type': 'LineString',
          'coordinates': destinations
        }
      }
    ]
  };

  // A single point that animates along the route.
  // Coordinates are initially set to origin.
  const point = {
    'type': 'FeatureCollection',
    'features': [
      {
        'type': 'Feature',
        'properties': {},
        'geometry': {
          'type': 'Point',
          'coordinates': destinations[0]
        }
      }
    ]
  };

  useEffect(() => {
    // eslint-disable-next-line
    map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-96, 37.8],
      zoom: 3
    });

    // Calculate the distance in kilometers between route start/end point.
    const lineDistance = turf.length(route.features[0]);

    let arc = [];

    // Draw an arc between the `origin` & `destination` of the two points
    for (let i = 0; i < lineDistance; i += lineDistance / steps) {
      const segment = turf.along(route.features[0], i);
      arc.push(segment.geometry.coordinates);
    }

    // Update the route with calculated arc coordinates
    route.features[0].geometry.coordinates = arc;

    map.on('load', () => {
      // Add a source and layer displaying a point which will be animated in a circle.
      map.addSource('route', {
        'type': 'geojson',
        'data': route
      });

      map.addSource('point', {
        'type': 'geojson',
        'data': point
      });

      map.addLayer({
        'id': 'route',
        'source': 'route',
        'type': 'line',
        'paint': {
          'line-width': 2,
          'line-color': '#007cbf'
        }
      });

      map.loadImage(diamond, function(error, image) {
        if (error) throw error;

        map.addImage('diamond', image);

        map.addLayer({
          'id': 'point',
          'source': 'point',
          'type': 'symbol',
          'layout': {
            'icon-image': 'diamond',
            'icon-size': 0.2,
            'icon-rotate': ['get', 'bearing'],
            'icon-rotation-alignment': 'map',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
          }
        });
      });

      // add markers to map
      destinations.forEach(function (marker) {
      // create a DOM element for the marker
        let el = document.createElement('div');
        el.className = 'marker';
        el.style.backgroundImage = `url(${marker1})`;
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.backgroundSize = '100%';

        el.addEventListener('click', function () {
          map.flyTo({
            center: marker,
            zoom: 9,
            bearing: 0,
            speed: 2,
            curve: 1,
            easing: easeCubic,
            essential: true
          });
        });

        map.on('mouseenter', marker, function () {
          map.getCanvas().style.cursor = 'pointer';
        });

        // add marker to map
        new mapboxgl.Marker(el, { anchor: 'bottom' })
          .setLngLat(marker)
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }) // add popups
              .setHTML(
                '<h3>Title</h3>' +
                '<p>' + marker + '</p>'
              )
              .on('close', () => {
                map.flyTo({
                  center: [-96, 37.8],
                  zoom: 3,
                  bearing: 0,
                  speed: 2,
                  curve: 1,
                  easing: easeCubic,
                  essential: true
                });
              })
          )
          .addTo(map);
      });

      animate();
    });

    return () => map.remove();
  }, []);

  const animate = () => {
    const start = route.features[0].geometry.coordinates[counter >= steps ? counter - 1 : counter];
    const end = route.features[0].geometry.coordinates[counter >= steps ? counter : counter + 1];

    if (!start || !end) return;

    // Update point geometry to a new position based on counter denoting
    // the index to access the arc
    point.features[0].geometry.coordinates = route.features[0].geometry.coordinates[counter];

    // Calculate the bearing to ensure the icon is rotated to match the route arc
    // The bearing is calculated between the current point and the next point, except
    // at the end of the arc, which uses the previous point and the current point
    point.features[0].properties.bearing = turf.bearing(
      turf.point(start),
      turf.point(end)
    );

    // Update the source with this new data
    map.getSource('point').setData(point);

    // Request the next frame of animation as long as the end has not been reached
    if (counter < steps) {
      requestAnimationFrame(animate);
    }

    counter = counter + 1;
  };

  const handleRestart = () => {
    map.flyTo({
      center: [-96, 37.8],
      zoom: 3,
      bearing: 0,
      speed: 2,
      curve: 1,
      easing: easeCubic,
      essential: true
    });

    // Set the coordinates of the original point back to origin
    point.features[0].geometry.coordinates = origin;

    // Update the source layer
    map.getSource('point').setData(point);

    // Reset the counter
    counter = 0;

    // Restart the animation
    animate();
  };

  return (
    <div className="map-wrapper">
      <h2>Mapbox Test</h2>

      <div className="map-container" ref={mapContainer}>
        <div id="map"/>

        <div className="overlay">
          <button id="replay-btn" onClick={handleRestart}>Replay</button>
        </div>
      </div>
    </div>
  );
};

export default App;
