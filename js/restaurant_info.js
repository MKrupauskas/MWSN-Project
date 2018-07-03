let restaurant;
var map;

// create idb store for comments
const commentsStore = new idbKeyval.Store("restaurant-comments", "comments");

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback, refetch = false) => {
  if (self.restaurant && !refetch) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const picture = document.getElementById('restaurant-pic');

  const source = document.createElement('source');
  source.dataset.srcset = `${DBHelper.imageUrlForRestaurant(restaurant).split('.')[0]}-small.jpg`;
  source.media = '(max-width: 650px)';
  picture.append(source);

  const image = document.createElement('img');
  image.className = 'restaurant-img lazyload';
  image.id = 'restaurant-img';
  image.dataset.src = DBHelper.imageUrlForRestaurant(restaurant) + '.jpg';
  image.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  image.alt = `Restaurant ${restaurant.name} in ${restaurant.neighborhood}`;
  picture.append(image);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  getReviewsData();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

getReviewsData = (refetch = false) => {
  idbKeyval.get(self.restaurant.id, commentsStore).then(val => {
    if (val && !refetch) {
      fillReviewsHTML(self.restaurant, val);
      return;
    } else {
      fetch(`http://localhost:1337/reviews/?restaurant_id=${self.restaurant.id}`)
        .then(response => response.json())
        .then(reviews => {
          idbKeyval.set(self.restaurant.id, reviews, commentsStore);
          fillReviewsHTML(self.restaurant, reviews);
        })
    }
  });
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (restaurant = self.restaurant, reviews) => {
  const container = document.getElementById('reviews-container');

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  ul.innerHTML = '';
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const time = new Date(review.createdAt);
  const date = document.createElement('p');
  date.innerHTML = time.toLocaleString();
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

window.onload = () => {
  document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const elements = e.target.elements;
    const data = {
      rating: elements[0].value,
      name: elements[1].value,
      comments: elements[2].value,
      restaurant_id: self.restaurant.id
    }
    e.target.reset();
    await fetch('http://localhost:1337/reviews', { method: 'POST', body: JSON.stringify(data) })
    getReviewsData(true);
  })

  document.querySelector('button').addEventListener('click', (e) => {
    idbKeyval.get("restaurants", store).then(async val => {
      val[self.restaurant.id - 1].is_favorite = !val[self.restaurant.id - 1].is_favorite
      await fetch(`http://localhost:1337/restaurants/${self.restaurant.id}/?is_favorite=${val[self.restaurant.id - 1].is_favorite}`, { method: 'PUT' })
      e.target.innerHTML = val[self.restaurant.id - 1].is_favorite ? 'Unfavorite Restaurant' : 'Favorite Restaurant' 
      await idbKeyval.set("restaurants", val, store)
    });
  })
}