fetch('../series.json')
    .then(response => response.json())
    .then(data => {
        const seriesTitle = document.getElementById('seriesTitle');
        const seasonsGrid = document.getElementById('seasonsGrid');

        const series = data.series.find(series => series.path === 'tulvaking');

        if (series) {
            seriesTitle.textContent = series.title;

            series.seasons.forEach(season => {
                const seasonElement = document.createElement('div');
                seasonElement.classList.add('season');

                const link = document.createElement('a');
                link.href = `s${season.number}/index.html`;

                const poster = document.createElement('img');
                poster.src = `s${season.number}/poster.jpg`;
                poster.alt = `${series.title} Season ${season.number} Poster`;

                const overlay = document.createElement('div');
                overlay.classList.add('overlay');

                const title = document.createElement('h2');
                title.textContent = `Season ${season.number}`;

                overlay.appendChild(title);
                link.appendChild(poster);
                link.appendChild(overlay);
                seasonElement.appendChild(link);
                seasonsGrid.appendChild(seasonElement);
            });
        }
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
    });
