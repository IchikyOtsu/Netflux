fetch('series.json')
    .then(response => response.json())
    .then(data => {
        const seriesGrid = document.getElementById('seriesGrid');

        data.series.forEach(series => {
            const seriesElement = document.createElement('div');
            seriesElement.classList.add('movie');

            const link = document.createElement('a');
            link.href = `${series.path}/index.html`;

            const poster = document.createElement('img');
            poster.src = `${series.path}/poster.jpg`;
            poster.alt = `${series.title} Poster`;

            const overlay = document.createElement('div');
            overlay.classList.add('overlay');

            const title = document.createElement('h2');
            title.textContent = series.title;

            overlay.appendChild(title);
            link.appendChild(poster);
            link.appendChild(overlay);
            seriesElement.appendChild(link);
            seriesGrid.appendChild(seriesElement);
        });
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
    });
