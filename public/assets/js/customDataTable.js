document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById('search');
    const exportBtn = document.getElementById('export-btn');
    const tbody = document.getElementById('order-tbody');
    const pagination = document.getElementById('pagination');
    const rowsPerPage = 10;
    let currentPage = 1;

    const filterRows = () => {
        const filter = searchInput.value.toLowerCase();
        const rows = Array.from(tbody.getElementsByTagName('tr'));
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            console.log(text)
            row.style.display = text.includes(filter) ? '' : 'none';
        });
    };

    const paginateRows = () => {
        const rows = Array.from(tbody.getElementsByTagName('tr'));
        const totalPages = Math.ceil(rows.length / rowsPerPage);
        rows.forEach((row, index) => {
            row.style.display = (index >= (currentPage - 1) * rowsPerPage && index < currentPage * rowsPerPage) ? '' : 'none';
        });
        updatePagination(totalPages);
    };

    const updatePagination = (totalPages) => {
        pagination.innerHTML = `
            <a href="#" class="pagination-previous"><span><i class="fa-solid fa-angle-left"></i></span></a>
            ${Array.from({ length: totalPages }, (_, i) => `<a href="#" class="page-items ${i + 1 === currentPage ? 'active' : ''}">${i + 1}</a>`).join('')}
            <a href="#" class="pagination-next"><span><i class="fa-solid fa-angle-right"></i></span></a>
        `;

        document.querySelectorAll('.page-items').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage = parseInt(e.target.textContent);
                paginateRows();
            });
        });

        document.querySelector('.pagination-previous').addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage > 1) {
                currentPage--;
                paginateRows();
            }
        });

        document.querySelector('.pagination-next').addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage < totalPages) {
                currentPage++;
                paginateRows();
            }
        });
    };

    const exportTableToCSV = (filename) => {
        const rows = Array.from(tbody.getElementsByTagName('tr'));
        const csvContent = "data:text/csv;charset=utf-8,"
            + rows.map(e => Array.from(e.getElementsByTagName('td')).map(td => td.innerText).join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    searchInput.addEventListener('input', filterRows);
    exportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        exportTableToCSV('order_list.csv');
    });

    paginateRows();
});
