import { CreditCard, Plus } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "../ui/carousel";

export interface Product {
  id: number;
  name: string;
  balance: number;
  color: string;
}

const Products = ({ products }: { products: Product[] }) => {
  return (
    <div className="mb-8">
      <h2 className="mb-4 text-xl font-semibold">Your Products</h2>
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full max-w-sm mx-auto md:max-w-2xl lg:max-w-4xl xl:max-w-6xl"
      >
        <CarouselContent>
          {products.map((product, index) => (
            <CarouselItem key={product.id} className="md:basis-1/2 lg:basis-1/3">
              <div className="p-1">
                <Card className="flex flex-col h-full">
                  <CardHeader className={`${product.color} text-white`}>
                    <CardTitle>{product.name}</CardTitle>
                    <CardDescription className="text-white/80">Balance: ${product.balance.toFixed(2)}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow p-4">
                    <CreditCard className="w-12 h-12 mb-2" />
                    <p>Card Number: **** **** **** {1234 + index}</p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      <Plus className="w-4 h-4 mr-2" /> Add Transaction
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
};

export default Products;
