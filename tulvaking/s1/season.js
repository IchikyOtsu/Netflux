fetch('../../series.json')
    .then(response => response.json())
    .then(data => {
        const seasonTitle = document.getElementById('seasonTitle');
        const episodesGrid = document.getElementById('episodesGrid');

        const series = data.series.find(series => series.path === 'tulvaking');

        if (series) {
            const season = series.seasons.find(season => season.number === 1);

            if (season) {
                seasonTitle.textContent = `${series.title} - Season ${season.number}`;

                season.episodes.forEach(episode => {
                    const episodeElement = document.createElement('div');
                    episodeElement.classList.add('episode');

                    const link = document.createElement('a');
                    link.href = episode.file;

                    const poster = document.createElement('img');
                    poster.src = `../s${season.number}/ep${episode.number}.jpg`;
                    poster.alt = `${series.title} S${season.number}E${episode.number}`;

                    const overlay = document.createElement('div');
                    overlay.classList.add('overlay');

                    const title = document.createElement('h2');
                    title.textContent = `Episode ${episode.number}`;

                    overlay.appendChild(title);
                    link.appendChild(poster);
                    link.appendChild(overlay);
                    episodeElement.appendChild(link);
                    episodesGrid.appendChild(episodeElement);
                });
            }
        }
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
    });
