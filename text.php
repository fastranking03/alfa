<table class="table table-seo">
    <tbody>
        <div class="detail-data-title">
            <h4>Page Speed Insights (PSI)</h4>
        </div>
        <tr>
            <td>First Contentful Paint</td>
            <td>{{ $seoData->first_contentful_paint_desktop }}</td>
            <td>{{ $seoData->first_contentful_paint_desktop_comments }}</td>
        </tr>
        <tr>
            <td>Largest Contentful Paint</td>
            <td>{{ $seoData->largest_contentful_paint_desktop }}</td>
            <td>{{ $seoData->largest_contentful_paint_desktop_comments }}</td>
        </tr>
        <tr>
            <td>Total Blocking Time</td>
            <td>{{ $seoData->total_blocking_time_desktop }}</td>
            <td>{{ $seoData->total_blocking_time_desktop_comments }}</td>
        </tr>
        <tr>
            <td>Cumulative Layout Shift</td>
            <td>{{ $seoData->cumulative_layout_shift_desktop }}</td>
            <td>{{ $seoData->cumulative_layout_shift_desktop_comments }}</td>
        </tr>
        <tr>
            <td>Speed Index</td>
            <td>{{ $seoData->speed_index_desktop }}</td>
            <td>{{ $seoData->speed_index_desktop_comments }}</td>
        </tr>
    </tbody>
</table>