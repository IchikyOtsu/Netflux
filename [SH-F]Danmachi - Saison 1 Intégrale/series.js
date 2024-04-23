fetch('../series.json')
    .then(response => response.json())
    .then(data => {
        const seriesTitle = document.getElementById('seriesTitle');
        const seasonsContainer = document.getElementById('seasonsContainer');

        const series = data.series.find(series => series.path === '[SH-F]Danmachi - Saison 1 Intégrale');

        if (series) {
            seriesTitle.textContent = series.title;

            series.seasons.forEach(season => {
                const seasonElement = document.createElement('div');
                seasonElement.classList.add('season');

                const title = document.createElement('h2');
                title.textContent = `Season ${season.number}`;

                const episodesList = document.createElement('ul');
                episodesList.classList.add('episodes-list');

                season.episodes.forEach(episode => {
                    const episodeElement = document.createElement('li');

                    const link = document.createElement('a');
                    link.href = `s${season.number}/${episode.file}`;
                    link.textContent = `Episode ${episode.number}`;

                    episodeElement.appendChild(link);
                    episodesList.appendChild(episodeElement);
                });

                seasonElement.appendChild(title);
                seasonElement.appendChild(episodesList);
                seasonsContainer.appendChild(seasonElement);
            });
        }
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
    });
