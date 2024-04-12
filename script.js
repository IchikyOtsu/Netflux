fetch('directories.json?t=' + new Date().getTime())
    .then(response => {
        if (!response.ok) {
            throw new Error('Erreur réseau');
        }
        return response.json();
    })
    .then(data => {
        console.log('Données reçues:', data);
        const movieGrid = document.getElementById('movieGrid');
        const searchInput = document.getElementById('searchInput');
        const subtitlesFilter = document.getElementById('subtitlesFilter');
        const audioFilter = document.getElementById('audioFilter');

        function displayMovies(movies) {
            movieGrid.innerHTML = '';

            movies.forEach(movie => {
                const movieElement = document.createElement('div');
                movieElement.classList.add('movie');

                const link = document.createElement('a');
                link.href = `${movie.path}/index.html`;

                const poster = document.createElement('img');
                poster.src = `${movie.path}/banner.jpg`;
                poster.alt = `${movie.title} Poster`;

                const overlay = document.createElement('div');
                overlay.classList.add('overlay');

                const movieInfo = document.createElement('div');
                movieInfo.classList.add('movie-info');

                const title = document.createElement('h2');
                title.textContent = movie.title;

                const year = document.createElement('p');
                year.textContent = `Year: ${movie.year}`;

                const quality = document.createElement('p');
                quality.textContent = `Quality: ${movie.quality}`;

                const genres = document.createElement('p');
                genres.textContent = `Genres: ${movie.genres.join(', ')}`;

                movieInfo.appendChild(title);
                movieInfo.appendChild(year);
                movieInfo.appendChild(quality);
                movieInfo.appendChild(genres);

                overlay.appendChild(movieInfo);

                link.appendChild(poster);
                link.appendChild(overlay);

                movieElement.appendChild(link);

                movieGrid.appendChild(movieElement);
            });
        }

        function filterMovies() {
            const searchTerm = searchInput.value.toLowerCase();
            const subtitles = subtitlesFilter.value;
            const audio = audioFilter.value;

            const filteredMovies = data.directories.filter(movie =>
                movie.title.toLowerCase().includes(searchTerm) &&
                (subtitles === '' || movie.subtitles.includes(subtitles)) &&
                (audio === '' || movie.audio.includes(audio))
            );

            displayMovies(filteredMovies);
        }

        displayMovies(data.directories);

        searchInput.addEventListener('input', filterMovies);
        subtitlesFilter.addEventListener('change', filterMovies);
        audioFilter.addEventListener('change', filterMovies);
    })
    .catch(error => {
        console.error('Il y a eu un problème avec l\'opération fetch:', error);
    });
