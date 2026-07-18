import { Link, useParams } from 'react-router-dom';
import { getPost } from './posts';
import './Blog.css';

export default function BlogPost() {
    const { slug } = useParams();
    const post = getPost(slug);

    if (!post) {
        return (
            <div className="content blog-page">
                <h1 className="page-title">Post not found</h1>
                <p className="page-sub">
                    <Link to="/blog" className="text-link">
                        Back to the blog <span className="chev">›</span>
                    </Link>
                </p>
            </div>
        );
    }

    return (
        <article className="content blog-post">
            <div className="post-date">
                {post.date} · {post.readingMinutes} min read
            </div>
            <h1 className="page-title">{post.title}</h1>
            <div className="post-body">
                {post.body.map((block, index) =>
                    typeof block === 'string' ? (
                        <p key={index}>{block}</p>
                    ) : (
                        <h2 key={index}>{block.h}</h2>
                    )
                )}
            </div>
            <Link to="/blog" className="text-link">
                ← All posts
            </Link>
        </article>
    );
}
